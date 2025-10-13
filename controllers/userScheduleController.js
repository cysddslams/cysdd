const db = require('../config/db');

// Get event schedule page for users
exports.getEventSchedule = async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/");
    }

    try {
        const eventId = req.params.eventId;
        const userId = req.session.user.id;

        console.log('Loading event schedule for event:', eventId, 'user:', userId);

        // Get event details
        const [events] = await db.execute(
            "SELECT * FROM events WHERE id = ? AND status = 'ongoing'",
            [eventId]
        );

        if (events.length === 0) {
            console.log('Event not found or expired:', eventId);
            req.flash('error', 'Event not found or has expired');
            return res.redirect('/events');
        }

        const event = events[0];
        console.log('Event found:', event.title);

        // Get all brackets for this event
        const [brackets] = await db.execute(
            `SELECT 
                tb.id,
                tb.event_id,
                tb.sport_type,
                tb.bracket_type,
                tb.created_at,
                tb.updated_at,
                COALESCE(tp.current_round, 1) as current_round, 
                COALESCE(tp.is_completed, FALSE) as is_completed, 
                t.teamName as champion_name
             FROM tournament_brackets tb
             LEFT JOIN tournament_progress tp ON tb.id = tp.bracket_id
             LEFT JOIN team t ON tp.champion_team_id = t.id
             WHERE tb.event_id = ?
             ORDER BY tb.created_at DESC`,
            [eventId]
        );

        console.log('Found brackets:', brackets.length);

        // Get enhanced match counts for each bracket
        const bracketsWithMatchCounts = await Promise.all(
            brackets.map(async (bracket) => {
                try {
                    // Get total matches count
                    const [totalMatches] = await db.execute(
                        "SELECT COUNT(*) as count FROM matches WHERE bracket_id = ?",
                        [bracket.id]
                    );
                    
                    // Get scheduled matches count (with date and venue)
                    const [scheduledMatches] = await db.execute(
                        "SELECT COUNT(*) as count FROM matches WHERE bracket_id = ? AND match_date IS NOT NULL",
                        [bracket.id]
                    );

                    // Get completed matches count
                    const [completedMatches] = await db.execute(
                        "SELECT COUNT(*) as count FROM matches WHERE bracket_id = ? AND status = 'completed'",
                        [bracket.id]
                    );

                    return {
                        ...bracket,
                        total_matches: totalMatches[0].count,
                        scheduled_matches: scheduledMatches[0].count,
                        completed_matches: completedMatches[0].count
                    };
                } catch (error) {
                    console.error(`Error getting match counts for bracket ${bracket.id}:`, error);
                    return {
                        ...bracket,
                        total_matches: 0,
                        scheduled_matches: 0,
                        completed_matches: 0
                    };
                }
            })
        );

        // Get user's teams for this event (to highlight user's teams)
        const [userTeams] = await db.execute(
            `SELECT DISTINCT t.id, t.teamName 
             FROM team t 
             JOIN team_players tp ON t.id = tp.team_id 
             WHERE tp.user_id = ? AND t.event_id = ? AND tp.status = 'confirmed'`,
            [userId, eventId]
        );

        console.log('User teams found:', userTeams.length);

        res.render('user/eventsSchedule', {
            user: req.session.user,
            event: event,
            brackets: bracketsWithMatchCounts,
            userTeams: userTeams,
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Error loading event schedule:', error);
        req.flash('error', 'Error loading event schedule');
        res.redirect('/events');
    }
};

// Get bracket matches with individual match schedules
exports.getBracketMatches = async (req, res) => {
    try {
        const { bracketId } = req.params;
        
        console.log('Fetching matches for bracket:', bracketId);

        // Get matches with team names and winner info
        const [matches] = await db.execute(
            `SELECT 
                m.id,
                m.bracket_id,
                m.round_number,
                m.match_number,
                m.team1_id,
                m.team2_id,
                m.match_date,
                m.venue,
                m.team1_score,
                m.team2_score,
                m.winner_team_id,
                m.status,
                m.created_at,
                m.updated_at,
                t1.teamName as team1_name, 
                t2.teamName as team2_name, 
                winner.teamName as winner_name
             FROM matches m
             LEFT JOIN team t1 ON m.team1_id = t1.id
             LEFT JOIN team t2 ON m.team2_id = t2.id
             LEFT JOIN team winner ON m.winner_team_id = winner.id
             WHERE m.bracket_id = ?
             ORDER BY 
                 m.round_number ASC, 
                 m.match_number ASC`,
            [bracketId]
        );

        console.log(`Found ${matches.length} matches for bracket ${bracketId}`);

        // Get bracket info with event details
        const [bracket] = await db.execute(
            `SELECT 
                tb.*, 
                e.title as event_name, 
                e.location as event_location,
                COALESCE(tp.current_round, 1) as current_round, 
                COALESCE(tp.is_completed, FALSE) as is_completed,
                tp.champion_team_id,
                t.teamName as champion_name
             FROM tournament_brackets tb
             LEFT JOIN events e ON tb.event_id = e.id
             LEFT JOIN tournament_progress tp ON tb.id = tp.bracket_id
             LEFT JOIN team t ON tp.champion_team_id = t.id
             WHERE tb.id = ?`,
            [bracketId]
        );

        if (bracket.length === 0) {
            console.log('Bracket not found:', bracketId);
            return res.status(404).json({ 
                success: false, 
                error: 'Bracket not found' 
            });
        }

        res.json({ 
            success: true, 
            matches: matches, 
            bracket: bracket[0] 
        });
    } catch (error) {
        console.error('Error getting bracket matches:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error: ' + error.message
        });
    }
};
