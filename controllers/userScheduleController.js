const db = require('../config/db');

// Get event schedule page for users
exports.getEventSchedule = async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/");
    }

    try {
        const eventId = req.params.eventId;
        const userId = req.session.user.id;

        // Get event details
        const [events] = await db.execute(
            "SELECT * FROM events WHERE id = ? AND status = 'ongoing'",
            [eventId]
        );

        if (events.length === 0) {
            req.flash('error', 'Event not found or has expired');
            return res.redirect('/events');
        }

        const event = events[0];

        // Get all brackets for this event with enhanced match counts
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

        // Get enhanced match counts for each bracket
        const bracketsWithMatchCounts = await Promise.all(
            brackets.map(async (bracket) => {
                // Get total matches count
                const [totalMatches] = await db.execute(
                    "SELECT COUNT(*) as count FROM matches WHERE bracket_id = ?",
                    [bracket.id]
                );
                
                // Get scheduled matches count (with date and venue)
                const [scheduledMatches] = await db.execute(
                    "SELECT COUNT(*) as count FROM matches WHERE bracket_id = ? AND match_date IS NOT NULL AND venue IS NOT NULL",
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
        
        // Get matches with team names and winner info - FIXED QUERY
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
            error: 'Internal server error' 
        });
    }
};

// Get all sports for an event (for navigation)
exports.getEventSports = async (req, res) => {
    try {
        const { eventId } = req.params;
        
        const [event] = await db.execute(
            "SELECT sports, esports, other_activities FROM events WHERE id = ?",
            [eventId]
        );

        if (event.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const eventData = event[0];
        const sports = [];

        // Parse sports from event data
        if (eventData.sports && eventData.sports !== 'none' && eventData.sports !== '') {
            const sportsList = eventData.sports.split(',').map(sport => sport.trim());
            sportsList.forEach(sport => {
                if (sport && sport !== 'none' && sport !== '') {
                    sports.push({
                        type: 'sports',
                        name: sport
                    });
                }
            });
        }

        if (eventData.esports && eventData.esports !== 'none' && eventData.esports !== '') {
            const esportsList = eventData.esports.split(',').map(esport => esport.trim());
            esportsList.forEach(esport => {
                if (esport && esport !== 'none' && esport !== '') {
                    sports.push({
                        type: 'esports',
                        name: esport
                    });
                }
            });
        }

        if (eventData.other_activities && eventData.other_activities !== 'none' && eventData.other_activities !== '') {
            const activitiesList = eventData.other_activities.split(',').map(activity => activity.trim());
            activitiesList.forEach(activity => {
                if (activity && activity !== 'none' && activity !== '') {
                    sports.push({
                        type: 'other_activities',
                        name: activity
                    });
                }
            });
        }

        res.json({ sports });
    } catch (error) {
        console.error('Error getting event sports:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
