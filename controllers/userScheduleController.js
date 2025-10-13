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

        // Get ALL matches for this event with bracket and team information
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
                winner.teamName as winner_name,
                tb.sport_type,
                tb.bracket_type,
                COALESCE(tp.current_round, 1) as current_round, 
                COALESCE(tp.is_completed, FALSE) as is_completed
             FROM matches m
             LEFT JOIN team t1 ON m.team1_id = t1.id
             LEFT JOIN team t2 ON m.team2_id = t2.id
             LEFT JOIN team winner ON m.winner_team_id = winner.id
             LEFT JOIN tournament_brackets tb ON m.bracket_id = tb.id
             LEFT JOIN tournament_progress tp ON tb.id = tp.bracket_id
             WHERE tb.event_id = ?
             ORDER BY 
                 tb.sport_type ASC,
                 m.round_number ASC, 
                 m.match_number ASC`,
            [eventId]
        );

        console.log(`Found ${matches.length} matches for event ${eventId}`);

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
            matches: matches, // Pass matches directly to the view
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
