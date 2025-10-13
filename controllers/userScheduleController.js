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

        // Get all brackets for this event
        const [brackets] = await db.execute(
            `SELECT tb.*, tp.current_round, tp.is_completed, t.teamName as champion_name
             FROM tournament_brackets tb
             LEFT JOIN tournament_progress tp ON tb.id = tp.bracket_id
             LEFT JOIN team t ON tp.champion_team_id = t.id
             WHERE tb.event_id = ?
             ORDER BY tb.created_at DESC`,
            [eventId]
        );

        // Get matches for each bracket
        const bracketsWithMatches = await Promise.all(
            brackets.map(async (bracket) => {
                const [matches] = await db.execute(
                    `SELECT m.*, t1.teamName as team1_name, t2.teamName as team2_name, 
                            winner.teamName as winner_name
                     FROM matches m
                     LEFT JOIN team t1 ON m.team1_id = t1.id
                     LEFT JOIN team t2 ON m.team2_id = t2.id
                     LEFT JOIN team winner ON m.winner_team_id = winner.id
                     WHERE m.bracket_id = ?
                     ORDER BY m.round_number, m.match_number`,
                    [bracket.id]
                );

                // Group matches by round
                const rounds = {};
                matches.forEach(match => {
                    if (!rounds[match.round_number]) {
                        rounds[match.round_number] = [];
                    }
                    rounds[match.round_number].push(match);
                });

                return {
                    ...bracket,
                    matches: matches,
                    rounds: rounds
                };
            })
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
            brackets: bracketsWithMatches,
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

// Get specific bracket matches (for AJAX)
exports.getBracketMatches = async (req, res) => {
    try {
        const { bracketId } = req.params;

        const [matches] = await db.execute(
            `SELECT m.*, t1.teamName as team1_name, t2.teamName as team2_name, 
                    winner.teamName as winner_name
             FROM matches m
             LEFT JOIN team t1 ON m.team1_id = t1.id
             LEFT JOIN team t2 ON m.team2_id = t2.id
             LEFT JOIN team winner ON m.winner_team_id = winner.id
             WHERE m.bracket_id = ?
             ORDER BY m.round_number, m.match_number`,
            [bracketId]
        );

        const [bracket] = await db.execute(
            `SELECT tb.*, tp.current_round, tp.is_completed, t.teamName as champion_name
             FROM tournament_brackets tb
             LEFT JOIN tournament_progress tp ON tb.id = tp.bracket_id
             LEFT JOIN team t ON tp.champion_team_id = t.id
             WHERE tb.id = ?`,
            [bracketId]
        );

        res.json({ 
            success: true, 
            matches: matches, 
            bracket: bracket[0] 
        });
    } catch (error) {
        console.error('Error getting bracket matches:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};