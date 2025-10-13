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

        // Get all brackets for this event with match count and scheduled matches info
        const [brackets] = await db.execute(
            `SELECT 
                tb.*, 
                tp.current_round, 
                tp.is_completed, 
                t.teamName as champion_name,
                COUNT(m.id) as total_matches,
                SUM(CASE WHEN m.match_date IS NOT NULL THEN 1 ELSE 0 END) as scheduled_matches
             FROM tournament_brackets tb
             LEFT JOIN tournament_progress tp ON tb.id = tp.bracket_id
             LEFT JOIN team t ON tp.champion_team_id = t.id
             LEFT JOIN matches m ON tb.id = m.bracket_id
             WHERE tb.event_id = ?
             GROUP BY tb.id
             ORDER BY tb.created_at DESC`,
            [eventId]
        );

        // Get user's teams for this event (to highlight user's teams)
        const [userTeams] = await db.execute(
            `SELECT t.id, t.teamName 
             FROM team t 
             JOIN team_players tp ON t.id = tp.team_id 
             WHERE tp.user_id = ? AND t.event_id = ? AND tp.status = 'confirmed'`,
            [userId, eventId]
        );

        res.render('user/eventsSchedule', {
            user: req.session.user,
            event: event,
            brackets: brackets,
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
        
        // Get matches with team names and winner info
        const [matches] = await db.execute(
            `SELECT 
                m.*, 
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
                tp.current_round, 
                tp.is_completed,
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
