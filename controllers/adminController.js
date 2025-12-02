const express = require('express');
const flash = require('connect-flash');
const bcrypt = require('bcryptjs');
const Admin = require('../models/adminModel');
const { validationResult } = require('express-validator');
const path = require('path');
const db = require('../config/db');
const { getPendingCoachNotifications, getPendingTeamNotifications } = require("../utils/notificationHelper");


// GET: Admin login page
exports.getAdminLogin = async (req, res) => {
    if (req.session.admin && req.session.admin.id) {
        return res.redirect("/admin/home");
    }

    const successMessage = req.session.success || "";
    req.session.success = null;

    res.render("admin/adminLogin", {
        messages: { success: successMessage },
        oldUser: ""
    });
};

//Post Admin Login
exports.postAdminLogin = async (req, res) => {
    const { user, password } = req.body;

    try {
        const admin = await Admin.getAdminCredentials(user);

        if (!admin) {
            return res.render("admin/adminLogin", {
                messages: { error: "Admin credentials not found" },
                oldUser: user
            });
        }

        const passwordMatch = await bcrypt.compare(password, admin.password);
        if (passwordMatch) {
            req.session.admin = {
                id: admin.id,
                username: admin.username
            };
            req.session.success = "Successfully logged in✅";

            return req.session.save(err => {
                if (err) {
                    console.error("Session save error:", err);
                    return res.render("admin/adminLogin", {
                        messages: { error: "Failed to establish session." },
                        oldUser: user
                    });
                }

                return res.redirect("/admin/home");
            });
        }

        return res.render("admin/adminLogin", {
            messages: { error: "Invalid username or password" },
            oldUser: user
        });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).render("admin/adminLogin", {
            messages: { error: "An error occurred during login" },
            oldUser: user
        });
    }
};

// Get admin Home
exports.getAdminHome = async (req, res) => {
    if (!req.session.admin) {
        return res.redirect("/admin");
    }

    try {
        const adminId = req.session.admin.id;
        const [adminData] = await db.execute("SELECT * FROM admins WHERE id = ?", [adminId]);
        const admin = adminData[0];

        // Get events
        const [ongoingEvents] = await db.execute("SELECT * FROM events WHERE status = ?", ['ongoing']);
        const [expiredEvents] = await db.execute("SELECT * FROM events WHERE status = ?", ['expired']);

        // Get dashboard statistics
        // Total users count (from users table)
        const [totalUsersResult] = await db.execute("SELECT COUNT(*) as total FROM users");
        const totalUsers = totalUsersResult[0].total;

        // Total players count
        const [totalPlayersResult] = await db.execute("SELECT COUNT(*) as total FROM team_players");
        const totalPlayers = totalPlayersResult[0].total;

        // Total coordinators count
        const [totalCoordinatorsResult] = await db.execute("SELECT COUNT(*) as total FROM coach");
        const totalCoordinators = totalCoordinatorsResult[0].total;

        // Pending player requests
        const [pendingPlayersResult] = await db.execute("SELECT COUNT(*) as total FROM team_players WHERE status = 'pending'");
        const pendingPlayers = pendingPlayersResult[0].total;

        // Pending coordinator requests
        const [pendingCoordinatorsResult] = await db.execute("SELECT COUNT(*) as total FROM coach WHERE status = 'pending'");
        const pendingCoordinators = pendingCoordinatorsResult[0].total;

        // Pending team requests
        const [pendingTeamRequestsResult] = await db.execute("SELECT COUNT(*) as total FROM team WHERE status = 'pending'");
        const pendingTeamRequests = pendingTeamRequestsResult[0].total;

        // Confirmed players
        const [confirmedPlayersResult] = await db.execute("SELECT COUNT(*) as total FROM team_players WHERE status = 'confirmed'");
        const confirmedPlayers = confirmedPlayersResult[0].total;

        // Confirmed coordinators
        const [confirmedCoordinatorsResult] = await db.execute("SELECT COUNT(*) as total FROM coach WHERE status = 'confirmed'");
        const confirmedCoordinators = confirmedCoordinatorsResult[0].total;

        // All registered teams
        const [allTeamsResult] = await db.execute("SELECT COUNT(*) as total FROM team");
        const allTeams = allTeamsResult[0].total;

        // Confirmed teams
        const [confirmedTeamsResult] = await db.execute("SELECT COUNT(*) as total FROM team WHERE status = 'confirmed'");
        const confirmedTeams = confirmedTeamsResult[0].total;

        // Get registration analytics data
        // Last 7 days registration data for team players
        const [weeklyRegistrations] = await db.execute(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as count
            FROM team_players 
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date
        `);

        // Last 30 days registration data for team players (for monthly view)
        const [monthlyRegistrations] = await db.execute(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as count
            FROM team_players 
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date
        `);

        // All-time registration data for team players
        const [allTimeRegistrations] = await db.execute(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as count
            FROM team_players 
            GROUP BY DATE(created_at)
            ORDER BY date
        `);

        // Registration by sport type
        const [sportRegistrations] = await db.execute(`
            SELECT 
                sports,
                COUNT(*) as count
            FROM team_players 
            WHERE sports IS NOT NULL AND sports != ''
            GROUP BY sports
            ORDER BY count DESC
            LIMIT 10
        `);

        // Registration trends by organization type
        const [organizationRegistrations] = await db.execute(`
            SELECT 
                t.organization,
                COUNT(tp.id) as count
            FROM team_players tp
            JOIN team t ON tp.team_id = t.id
            WHERE t.organization IS NOT NULL
            GROUP BY t.organization
            ORDER BY count DESC
        `);

        // Format the registration data for charts
        const last7Days = [];
        const last30Days = [];
        
        // Generate last 7 days dates
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            last7Days.push(date.toISOString().split('T')[0]);
        }

        // Generate last 30 days dates
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            last30Days.push(date.toISOString().split('T')[0]);
        }

        // Map weekly data
        const weeklyData = last7Days.map(date => {
            const found = weeklyRegistrations.find(reg => reg.date.toISOString().split('T')[0] === date);
            return {
                date: date,
                count: found ? found.count : 0
            };
        });

        // Map monthly data
        const monthlyData = last30Days.map(date => {
            const found = monthlyRegistrations.find(reg => reg.date.toISOString().split('T')[0] === date);
            return {
                date: date,
                count: found ? found.count : 0
            };
        });

        // Map all-time data
        const allTimeData = allTimeRegistrations.map(reg => ({
            date: reg.date.toISOString().split('T')[0],
            count: reg.count
        }));

        // Get notifications
        const newCoachRequests = await getPendingCoachNotifications();
        const newTeamRequests = await getPendingTeamNotifications();

        return res.render("admin/adminHome", {
            admin,
            ongoingEvents,
            expiredEvents,
            success: res.locals.success || "",
            newCoachRequests,
            newTeamRequests,
            dashboardStats: {
                totalUsers, // Added this line
                totalPlayers,
                totalCoordinators,
                pendingPlayers,
                pendingCoordinators,
                pendingTeamRequests,
                confirmedPlayers,
                confirmedCoordinators,
                allTeams,
                confirmedTeams
            },
            registrationAnalytics: {
                weekly: weeklyData,
                monthly: monthlyData,
                all: allTimeData,
                bySport: sportRegistrations,
                byOrganization: organizationRegistrations
            }
        });
    } catch (err) {
        console.error("Error loading admin home:", err);
        return res.render("admin/adminHome", {
            admin: {},
            ongoingEvents: [],
            expiredEvents: [],
            success: "",
            newCoachRequests: [],
            newTeamRequests: [],
            dashboardStats: {
                totalUsers: 0, // Added this line
                totalPlayers: 0,
                totalCoordinators: 0,
                pendingPlayers: 0,
                pendingCoordinators: 0,
                pendingTeamRequests: 0,
                confirmedPlayers: 0,
                confirmedCoordinators: 0,
                allTeams: 0,
                confirmedTeams: 0
            },
            registrationAnalytics: {
                weekly: [],
                monthly: [],
                all: [],
                bySport: [],
                byOrganization: []
            }
        });
    }
};



// GET: Admin profile
exports.getAdminProfile = async (req, res) => {
    if (!req.session.admin || !req.session.admin.id) {
        return res.redirect("/admin");
    }

    const adminId = req.session.admin.id;

    try {
        const [adminRows] = await db.execute("SELECT * FROM admins WHERE id = ?", [adminId]);
        const admin = adminRows[0];

        const success = req.query.success === "1"; // true if ?success=1

        res.render("admin/adminProfile", {
            admin,
            messages: {},
            success // pass to EJS
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching admin profile.");
    }
};

//get adminChangePassword form
exports.getChangePassword = (req, res) => {
    if (!req.session.admin || !req.session.admin.id) {
        return res.redirect("/admin");
    }

    res.render("admin/adminChangePassword", {
        success: false,
        error: null
    });
};

//Change password 
exports.postChangePassword = async (req, res) => {
    const adminId = req.session.admin.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    try {
        const [rows] = await db.execute("SELECT password FROM admins WHERE id = ?", [adminId]);
        const hashedPassword = rows[0]?.password;

        const isMatch = await bcrypt.compare(currentPassword, hashedPassword);
        if (!isMatch) {
            return res.render("admin/adminChangePassword", {
                success: false,
                error: "Old password is incorrect."
            });
        }

        if (newPassword !== confirmPassword) {
            return res.render("admin/adminChangePassword", {
                success: false,
                error: "Password do not match."
            });
        }

        const newHashedPassword = await bcrypt.hash(newPassword, 10);
        await db.execute("UPDATE admins SET password = ? WHERE id = ?", [newHashedPassword, adminId]);

        return res.render("admin/adminChangePassword", {
            success: true,
            error: null
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
};


// POST: Handle admin profile picture update
exports.postAdminProfile = async (req, res) => {
    if (!req.session.admin || !req.session.admin.id) {
        return res.redirect("/admin");
    }

    const adminId = req.session.admin.id;
    const profilePic = req.file ? "/uploads/adminProfile/" + req.file.filename : null;

    if (!profilePic) {
        return res.redirect("/admin/adminProfile");
    }

    try {
        await db.execute("UPDATE admins SET profilePic = ? WHERE id = ?", [profilePic, adminId]);
        res.redirect("/admin/adminProfile?success=1"); // Add query param
    } catch (err) {
        console.error(err);
        res.status(500).send("Failed to update profile picture.");
    }
};



// Get admin Posts page
exports.getAdminPosts = async (req, res) => {
    if (!req.session.admin) {
        return res.redirect("/admin");
    }
    const username = req.session.admin.username;
    const adminId = req.session.admin.id;
    const success = req.session.success;
    const error = req.session.error;
    req.session.success = null;
    req.session.error = null;

    try {
        const [[adminData]] = await db.execute("SELECT * FROM admins WHERE username = ?", [username]);
        let [posts] = await db.execute("SELECT * FROM posts ORDER BY created_at DESC");

        if (!adminData) {
            return res.redirect("/admin");
        }

        const postIds = posts.map(post => post.id);
        let reactionsData = {};
        posts.forEach(post => {
            reactionsData[post.id] = {
                likes: 0,
                dislikes: 0,
                hasLiked: false,
                hasDisliked: false
            };
        });

        if (postIds.length > 0) {
            const placeholders = postIds.map(() => '?').join(',');

            const [countResults] = await db.execute(`
                SELECT 
                    post_id,
                    SUM(reaction_type = 'like') AS likes,
                    SUM(reaction_type = 'dislike') AS dislikes
                FROM post_reactions
                WHERE post_id IN (${placeholders})
                GROUP BY post_id
            `, postIds);

            countResults.forEach(reaction => {
                reactionsData[reaction.post_id].likes = reaction.likes || 0;
                reactionsData[reaction.post_id].dislikes = reaction.dislikes || 0;
            });
            const [adminReactions] = await db.execute(`
                SELECT post_id, reaction_type 
                FROM post_reactions 
                WHERE post_id IN (${placeholders}) AND admin_id = ?
            `, [...postIds, adminId]);

            adminReactions.forEach(reaction => {
                reactionsData[reaction.post_id].hasLiked = reaction.reaction_type === 'like';
                reactionsData[reaction.post_id].hasDisliked = reaction.reaction_type === 'dislike';
            });
        }
        posts = posts.map(post => {
            const reactions = reactionsData[post.id];
            return {
                ...post,
                images: post.images ? JSON.parse(post.images) : [],
                videos: post.videos ? JSON.parse(post.videos) : [],
                likes: reactions.likes,
                dislikes: reactions.dislikes,
                hasLiked: reactions.hasLiked,
                hasDisliked: reactions.hasDisliked
            };
        });

        res.render("admin/adminPosts", {
            admin: adminData,
            posts,
            formatTimeAgo: formatTimeAgo,
            success: res.locals.success || "",
            error
        });
    } catch (err) {
        console.error("Error fetching admin data or posts:", err);
        res.redirect("/admin");
    }
};


//Get Add post page
exports.getAdminAddPost = (req, res) => {
    if (!req.session.admin) {
        return res.redirect("/admin");
    }
    res.render("admin/adminAddPost", { messages: {} });
};


// POST Add Post
exports.postAdminAddPost = async (req, res) => {
  try {
    const caption = req.body.caption || '';
    const mediaFiles = req.files || [];
    console.log("Uploaded files:", mediaFiles);

    const images = mediaFiles
      .filter(file => file.mimetype.startsWith('image'))
      .map(file => ({
        url: file.path,        
        public_id: file.filename 
      }));

    const videos = mediaFiles
      .filter(file => file.mimetype.startsWith('video'))
      .map(file => ({
        url: file.path,
        public_id: file.filename
      }));
    await db.execute(
      "INSERT INTO posts (images, videos, caption) VALUES (?, ?, ?)",
      [JSON.stringify(images), JSON.stringify(videos), caption]
    );

    res.redirect("/admin/posts");
  } catch (error) {
    console.error("Error uploading post:", error);
    res.status(500).send("Error saving the post.");
  }
};

// Helper function to format date 
function formatTimeAgo(dateString) {
    const now = new Date();
    const postDate = new Date(dateString);
    const seconds = Math.floor((now - postDate) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) {
        return interval === 1 ? "1yr" : `${interval}yrs`;
    }
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) {
        return interval === 1 ? "1mon" : `${interval}mons`;
    } 
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) {
        return interval === 1 ? "1d" : `${interval}d`;
    }
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) {
        return interval === 1 ? "1h" : `${interval}h`;
    }
    
    interval = Math.floor(seconds / 60);
    if (interval >= 1) {
        return interval === 1 ? "1m" : `${interval}m`;
    }
    return "just now";
};


//React to Post
exports.reactToPost = async (req, res) => {
    if (!req.session.admin) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const adminId = req.session.admin.id;
    const { postId, reactionType } = req.params;

    try {
        const [currentReaction] = await db.execute(`
            SELECT reaction_type 
            FROM post_reactions 
            WHERE post_id = ? AND admin_id = ?
        `, [postId, adminId]);

        let shouldRemove = false;
        if (currentReaction.length > 0) {
            shouldRemove = currentReaction[0].reaction_type === reactionType;
        }

        if (shouldRemove) {
            await db.execute(`
                DELETE FROM post_reactions 
                WHERE post_id = ? AND admin_id = ?
            `, [postId, adminId]);
        } else {
            await db.execute(`
                DELETE FROM post_reactions 
                WHERE post_id = ? AND admin_id = ?
            `, [postId, adminId]);
            
            await db.execute(`
                INSERT INTO post_reactions 
                (post_id, admin_id, reaction_type) 
                VALUES (?, ?, ?)
            `, [postId, adminId, reactionType]);
        }

        const [reactions] = await db.execute(`
            SELECT 
                SUM(reaction_type = 'like') AS likes,
                SUM(reaction_type = 'dislike') AS dislikes,
                EXISTS(SELECT 1 FROM post_reactions 
                       WHERE post_id = ? AND admin_id = ? 
                       AND reaction_type = 'like') AS has_liked,
                EXISTS(SELECT 1 FROM post_reactions 
                       WHERE post_id = ? AND admin_id = ? 
                       AND reaction_type = 'dislike') AS has_disliked
            FROM post_reactions
            WHERE post_id = ?
        `, [postId, adminId, postId, adminId, postId]);
        res.json({
            likes: reactions[0].likes || 0,
            dislikes: reactions[0].dislikes || 0,
            hasLiked: Boolean(reactions[0].has_liked),
            hasDisliked: Boolean(reactions[0].has_disliked)
        });
    } catch (err) {
        console.error("Error reacting to post:", err);
        res.status(500).json({ error: 'Failed to process reaction' });
    }
};

//Delete posts
exports.deletePost = async (req, res) => {
    const postId = req.params.postId;

    try {
        await db.execute("DELETE FROM posts WHERE id = ?", [postId]);
        req.session.success = "Post deleted successfully!";
        res.redirect("/admin/posts");
    } catch (err) {
        console.error("Error deleting post:", err);
        req.session.error = "Error deleting post. Please try again.";
        res.redirect("/admin/posts");
    }
};



// Logout admin
exports.logoutAdmin = (req, res) => {
    req.session.destroy(() => {
        res.redirect("/admin");
    });
};



// Get Admin Events
exports.getAdminEvents = async (req, res) => {
    if (!req.session.admin) {
        return res.redirect("/admin");
    }
    const username = req.session.admin.username;
    try {
        const [events] = await db.execute('SELECT * FROM events');
        const [rows] = await db.execute("SELECT * FROM admins WHERE username = ?", [username]);
        if (rows.length === 0) {
            return res.redirect("/admin");
        }
        const adminData = rows[0];
        if (adminData.profilePic) {
            adminData.profilePic = adminData.profilePic; 
        }
        res.render("admin/adminEvents", {
            events: events,
            messages: {},
            admin: adminData
        });
    } catch (error) {
        console.error("Error fetching events or admin data:", error);
        res.render("admin/adminEvents", {
            events: [],
            messages: { error: "There was an error fetching events." },
            admin: null
        });
    }
};

// Get Event Details
exports.getEventDetails = async (req, res) => {
    if (!req.session.admin) {
        return res.redirect("/admin");
    }
    const eventId = req.params.id;
    const username = req.session.admin.username;
    try {
        const [eventRows] = await db.execute('SELECT * FROM events WHERE id = ?', [eventId]);
        
        if (eventRows.length === 0) {
            return res.redirect('/admin/events');
        }
        const event = eventRows[0];
        event.formattedDate = new Date(event.date_schedule).toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        const [adminRows] = await db.execute("SELECT * FROM admins WHERE username = ?", [username]);
        const admin = adminRows[0];

        res.render("admin/adminEventDetails", {
            event: event,
            admin: admin,
            messages: {}
        });
    } catch (error) {
        console.error("Error fetching event details:", error);
        res.redirect('/admin/event-details');
    }
};

// Get Create Event page
exports.getCreateEvent = async (req, res) => {
    if (!req.session.admin) {
        return res.redirect("/admin");
    }
    try {
        const adminId = req.session.admin.id;
        const [adminRows] = await db.execute('SELECT * FROM admins WHERE id = ?', [adminId]);
        
        if (adminRows.length === 0) {
            return res.redirect("/admin");
        }
        const admin = adminRows[0];
        res.render("admin/createEvents", { 
            messages: {},
            admin: admin 
        });
    } catch (error) {
        console.error("Error fetching admin data:", error);
        res.redirect("/admin");
    }
};

// Post Create Event 
exports.postCreateEvent = async (req, res) => {
    if (!req.session.admin) {
        return res.redirect("/admin");
    }

    try {
        console.log("Raw form data:", req.body);
        console.log("Uploaded files:", req.files);
        const { title, description, date_schedule, location } = req.body;

        // Ensure arrays are always arrays, even if only one checkbox is selected
        const sports = [].concat(req.body.sports || req.body['sports[]'] || []);
        const esports = [].concat(req.body.esports || req.body['esports[]'] || []);
        const otherActivities = [].concat(req.body.other_activities || req.body['other_activities[]'] || []);

        // Uploaded files
        const image = req.files?.image ? req.files.image[0].path : null;
        const appointmentForm = req.files?.appointmentForm ? req.files.appointmentForm[0].path : null;

        console.log("Processed data:", {
            title,
            description,
            sports,
            esports,
            otherActivities,
            image,
            appointmentForm,
            date_schedule,
            location
        });

        // Validation
        if (sports.length === 0 && esports.length === 0 && otherActivities.length === 0) {
            return res.render("admin/createEvents", {
                messages: { error: "Please select at least one category (Sports, Esports, or Other Activities)" },
                formData: req.body
            });
        }

        // Convert arrays to comma-separated strings for DB
        const sportsString = sports.join(",");
        const esportsString = esports.join(",");
        const otherActivitiesString = otherActivities.join(",");

        console.log("Final data for insertion:", {
            title,
            description,
            sportsString,
            esportsString,
            otherActivitiesString,
            image,
            appointmentForm,
            date_schedule,
            location
        });

        // Insert into DB
        const [result] = await db.execute(
            `INSERT INTO events 
             (title, description, sports, esports, other_activities, image, appointmentForm, date_schedule, location) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, description, sportsString, esportsString, otherActivitiesString, image, appointmentForm, date_schedule, location]
        );

        console.log("Insert successful:", result);
        res.redirect('/admin/events');
    } catch (error) {
        console.error("Error:", error);
        res.render("admin/createEvents", {
            messages: { 
                error: "There was an error while creating the event. Please try again.",
                details: error.message
            },
            formData: req.body
        });
    }
};

// Get Edit Event page
exports.getEditEvent = async (req, res) => {
    if (!req.session.admin) {
        return res.redirect("/admin");
    }
    const eventId = req.params.id;
    try {
        const [eventRows] = await db.execute('SELECT * FROM events WHERE id = ?', [eventId]);
        if (eventRows.length === 0) {
            return res.redirect('/admin/events');
        }
        const event = eventRows[0];
        event.formattedDate = new Date(event.date_schedule).toISOString().slice(0, 16);
        res.render("admin/editEventDetails", {
            event: event,
            messages: {}
        });
    } catch (error) {
        console.error("Error fetching event:", error);
        res.redirect('/admin/events');
    }
};

// Update Event 
exports.postUpdateEvent = async (req, res) => {
    if (!req.session.admin) {
        return res.redirect("/admin");
    }
    const eventId = req.params.id;
    try {
        console.log("Raw form data:", req.body);
        console.log("Uploaded files:", req.files);
        const { title, description, date_schedule, location } = req.body;
        
        // Get arrays for sports, esports, and other activities
        const sports = [].concat(req.body.sports || req.body['sports[]'] || []);
        const esports = [].concat(req.body.esports || req.body['esports[]'] || []);
        const otherActivities = [].concat(req.body.other_activities || req.body['other_activities[]'] || []);
        
        // Get file names (keep existing if no new file uploaded)
        let image, appointmentForm;
        const [currentEvent] = await db.execute('SELECT image, appointmentForm, status FROM events WHERE id = ?', [eventId]);
        
        if (req.files?.image) {
            image = req.files.image[0].path; 
        } else {
            image = currentEvent[0].image;
        }
        
        if (req.files?.appointmentForm) {
            appointmentForm = req.files.appointmentForm[0].path; 
        } else {
            appointmentForm = currentEvent[0].appointmentForm;
        }
        const status = req.body.status || currentEvent[0].status || null;

        console.log("Processed data:", {
            title,
            description,
            sports,
            esports,
            otherActivities,
            image,
            appointmentForm,
            date_schedule,
            location,
            status
        });

        // Validate at least one category is selected
        if (sports.length === 0 && esports.length === 0 && otherActivities.length === 0) {
            console.log("Validation failed: No categories selected");
            
            // Re-fetch event data to render the form again
            const [eventRows] = await db.execute('SELECT * FROM events WHERE id = ?', [eventId]);
            const event = eventRows[0];
            event.formattedDate = new Date(event.date_schedule).toISOString().slice(0, 16);
            
            return res.render("admin/editEventDetails", {
                messages: { error: "Please select at least one category (Sports, Esports, or Other Activities)" },
                event: event
            });
        }
        // Convert arrays to comma-separated strings
        const sportsString = sports.join(',');
        const esportsString = esports.join(',');
        const otherActivitiesString = otherActivities.join(',');
        
        console.log("Final data for update:", {
            title,
            description,
            sportsString,
            esportsString,
            otherActivitiesString,
            image,
            appointmentForm,
            date_schedule,
            location,
            status
        });

        const [result] = await db.execute(
            `UPDATE events SET 
                title = ?, description = ?, 
                sports = ?, esports = ?, other_activities = ?,
                image = ?, appointmentForm = ?, 
                date_schedule = ?, location = ?, status = ?, 
                updated_at = NOW() 
            WHERE id = ?`,
            [
                title, description, 
                sportsString, esportsString, otherActivitiesString,
                image, appointmentForm, 
                date_schedule, location, status, 
                eventId
            ]
        );
        
        console.log("Update successful, result:", result);
        res.redirect(`/admin/events/${eventId}`);
    } catch (error) {
        console.error("Error:", error);
        
        // Re-fetch event data to render the form again
        const [eventRows] = await db.execute('SELECT * FROM events WHERE id = ?', [eventId]);
        const event = eventRows[0];
        event.formattedDate = new Date(event.date_schedule).toISOString().slice(0, 16);
        
        res.render("admin/editEventDetails", {
            messages: { 
                error: "There was an error while updating the event. Please try again.",
                details: error.message
            },
            event: event
        });
    }
};

// Helper function to convert display names to sport codes 
function convertDisplayNameToSportCode(displayName) {
    const reverseSportMap = {
        // Basketball
        'Basketball Men': 'basketball_men',
        'Basketball Women': 'basketball_women',
        
        // Volleyball
        'Volleyball Men': 'volleyball_men',
        'Volleyball Women': 'volleyball_women',
        
        // Soccer
        'Soccer Men': 'soccer_men',
        'Soccer Women': 'soccer_women',
        
        // Badminton
        'Badminton Men': 'badminton_men',
        'Badminton Women': 'badminton_women',
        
        // Other sports
        'Sepak Takraw Men': 'sepak_takraw_men',
        'Sepak Takraw Women': 'sepak_takraw_women',
        'Table Tennis Men': 'table_tennis_men',
        'Table Tennis Women': 'table_tennis_women',
        'Chess Men': 'chess_men',
        'Chess Women': 'chess_women',
        'Taekwondo Men': 'taekwondo_men',
        'Taekwondo Women': 'taekwondo_women',
        'Arnis Men': 'arnis_men',
        'Arnis Women': 'arnis_women',
        'Gymnastic Men': 'gymnastic_men',
        'Gymnastic Women': 'gymnastic_women',
        
        // Athletics
        'Athletics - 100m Sprint Men': 'athletics_100m_men',
        'Athletics - 100m Sprint Women': 'athletics_100m_women',
        'Athletics - 200m Sprint Men': 'athletics_200m_men',
        'Athletics - 200m Sprint Women': 'athletics_200m_women',
        'Athletics - 400m Sprint Men': 'athletics_400m_men',
        'Athletics - 400m Sprint Women': 'athletics_400m_women',
        'Athletics - 800m Run Men': 'athletics_800m_men',
        'Athletics - 800m Run Women': 'athletics_800m_women',
        'Athletics - 1500m Run Men': 'athletics_1500m_men',
        'Athletics - 1500m Run Women': 'athletics_1500m_women',
        'Athletics - 5000m Run Men': 'athletics_5000m_men',
        'Athletics - 5000m Run Women': 'athletics_5000m_women',
        'Athletics - Long Jump Men': 'athletics_longjump_men',
        'Athletics - Long Jump Women': 'athletics_longjump_women',
        'Athletics - High Jump Men': 'athletics_highjump_men',
        'Athletics - High Jump Women': 'athletics_highjump_women',
        'Athletics - Triple Jump Men': 'athletics_triplejump_men',
        'Athletics - Triple Jump Women': 'athletics_triplejump_women',
        'Athletics - Shot Put Men': 'athletics_shotput_men',
        'Athletics - Shot Put Women': 'athletics_shotput_women',
        'Athletics - Javelin Throw Men': 'athletics_javelin_men',
        'Athletics - Javelin Throw Women': 'athletics_javelin_women',
        'Athletics - Discus Throw Men': 'athletics_discusthrow_men',
        'Athletics - Discus Throw Women': 'athletics_discusthrow_women',
        'Athletics - 4x100m Relay Men': 'athletics_4x100_men',
        'Athletics - 4x100m Relay Women': 'athletics_4x100_women',
        'Athletics - 4x400m Relay Men': 'athletics_4x400_men',
        'Athletics - 4x400m Relay Women': 'athletics_4x400_women',
        
        // Esports
        'Mobile Legends': 'ml',
        'CODM': 'codm',
        
        // Activities
        'Cheerdance': 'cheerdance',
        'Dance Competition': 'dance_competition',
        'Singing Contest': 'singing_contest'
    };

    return reverseSportMap[displayName] || displayName;
}

// Helper function to convert sport codes to display names
function convertSportCodesToDisplayNames(sportCodes) {
    const displayNames = [];
    
    const sportDisplayMap = {
        // Basketball
        'basketball_men': 'Basketball Men',
        'basketball_women': 'Basketball Women',
        
        // Volleyball
        'volleyball_men': 'Volleyball Men',
        'volleyball_women': 'Volleyball Women',
        
        // Soccer
        'soccer_men': 'Soccer Men',
        'soccer_women': 'Soccer Women',
        
        // Badminton
        'badminton_men': 'Badminton Men',
        'badminton_women': 'Badminton Women',
        
        // Other sports
        'sepak_takraw_men': 'Sepak Takraw Men',
        'sepak_takraw_women': 'Sepak Takraw Women',
        'table_tennis_men': 'Table Tennis Men',
        'table_tennis_women': 'Table Tennis Women',
        'chess_men': 'Chess Men',
        'chess_women': 'Chess Women',
        'taekwondo_men': 'Taekwondo Men',
        'taekwondo_women': 'Taekwondo Women',
        'arnis_men': 'Arnis Men',
        'arnis_women': 'Arnis Women',
        'gymnastic_men': 'Gymnastic Men',
        'gymnastic_women': 'Gymnastic Women',
        
        // Athletics
        'athletics_100m_men': 'Athletics - 100m Sprint Men',
        'athletics_100m_women': 'Athletics - 100m Sprint Women',
        'athletics_200m_men': 'Athletics - 200m Sprint Men',
        'athletics_200m_women': 'Athletics - 200m Sprint Women',
        'athletics_400m_men': 'Athletics - 400m Sprint Men',
        'athletics_400m_women': 'Athletics - 400m Sprint Women',
        'athletics_800m_men': 'Athletics - 800m Run Men',
        'athletics_800m_women': 'Athletics - 800m Run Women',
        'athletics_1500m_men': 'Athletics - 1500m Run Men',
        'athletics_1500m_women': 'Athletics - 1500m Run Women',
        'athletics_5000m_men': 'Athletics - 5000m Run Men',
        'athletics_5000m_women': 'Athletics - 5000m Run Women',
        'athletics_longjump_men': 'Athletics - Long Jump Men',
        'athletics_longjump_women': 'Athletics - Long Jump Women',
        'athletics_highjump_men': 'Athletics - High Jump Men',
        'athletics_highjump_women': 'Athletics - High Jump Women',
        'athletics_triplejump_men': 'Athletics - Triple Jump Men',
        'athletics_triplejump_women': 'Athletics - Triple Jump Women',
        'athletics_shotput_men': 'Athletics - Shot Put Men',
        'athletics_shotput_women': 'Athletics - Shot Put Women',
        'athletics_javelin_men': 'Athletics - Javelin Throw Men',
        'athletics_javelin_women': 'Athletics - Javelin Throw Women',
        'athletics_discusthrow_men': 'Athletics - Discus Throw Men',
        'athletics_discusthrow_women': 'Athletics - Discus Throw Women',
        'athletics_4x100_men': 'Athletics - 4x100m Relay Men',
        'athletics_4x100_women': 'Athletics - 4x100m Relay Women',
        'athletics_4x400_men': 'Athletics - 4x400m Relay Men',
        'athletics_4x400_women': 'Athletics - 4x400m Relay Women'
    };

    sportCodes.forEach(code => {
        if (sportDisplayMap[code]) {
            displayNames.push(sportDisplayMap[code]);
        } else {
            // For backward compatibility with old codes
            displayNames.push(code);
        }
    });

    return displayNames;
}


// Get Create Event page
exports.getCreateEvent = async (req, res) => {
    if (!req.session.admin) {
        return res.redirect("/admin");
    }
    
    try {
        const adminId = req.session.admin.id;
        const [adminRows] = await db.execute('SELECT * FROM admins WHERE id = ?', [adminId]);
        
        if (adminRows.length === 0) {
            return res.redirect("/admin");
        }
        const admin = adminRows[0];
        
        res.render("admin/createEvents", { 
            messages: {},
            admin: admin 
        });
    } catch (error) {
        console.error("Error fetching admin data:", error);
        res.redirect("/admin");
    }
};

// Post Create Event 
exports.postCreateEvent = async (req, res) => {
    if (!req.session.admin) {
        return res.redirect("/admin");
    }

    try {
        console.log("Raw form data:", req.body);
        console.log("Uploaded files:", req.files);

        const { title, description, date_schedule, location } = req.body;
        const sports = [].concat(req.body.sports || req.body['sports[]'] || []);
        const esports = [].concat(req.body.esports || req.body['esports[]'] || []);
        const otherActivities = [].concat(req.body.other_activities || req.body['other_activities[]'] || []);

        // Uploaded files
        const image = req.files?.image ? req.files.image[0].path : null;
        const appointmentForm = req.files?.appointmentForm ? req.files.appointmentForm[0].path : null;

        console.log("Processed data:", {
            title,
            description,
            sports,
            esports,
            otherActivities,
            image,
            appointmentForm,
            date_schedule,
            location
        });

        // Validation
        if (sports.length === 0 && esports.length === 0 && otherActivities.length === 0) {
            return res.render("admin/createEvents", {
                messages: { error: "Please select at least one category (Sports, Esports, or Other Activities)" },
                formData: req.body
            });
        }

        // Convert arrays to comma-separated strings for DB
        const sportsString = sports.join(",");
        const esportsString = esports.join(",");
        const otherActivitiesString = otherActivities.join(",");

        console.log("Final data for insertion:", {
            title,
            description,
            sportsString,
            esportsString,
            otherActivitiesString,
            image,
            appointmentForm,
            date_schedule,
            location
        });

        // Insert into DB
        const [result] = await db.execute(
            `INSERT INTO events 
             (title, description, sports, esports, other_activities, image, appointmentForm, date_schedule, location) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, description, sportsString, esportsString, otherActivitiesString, image, appointmentForm, date_schedule, location]
        );

        console.log("Insert successful:", result);
        res.redirect('/admin/events');
    } catch (error) {
        console.error("Error:", error);
        res.render("admin/createEvents", {
            messages: { 
                error: "There was an error while creating the event. Please try again.",
                details: error.message
            },
            formData: req.body
        });
    }
};

// Helper function to convert display names to sport codes (for consistency)
function convertDisplayNameToSportCode(displayName) {
    const reverseSportMap = {
        // Basketball
        'Basketball Men': 'basketball_men',
        'Basketball Women': 'basketball_women',
        
        // Volleyball
        'Volleyball Men': 'volleyball_men',
        'Volleyball Women': 'volleyball_women',
        
        // Soccer
        'Soccer Men': 'soccer_men',
        'Soccer Women': 'soccer_women',
        
        // Badminton
        'Badminton Men': 'badminton_men',
        'Badminton Women': 'badminton_women',
        
        // Other sports
        'Sepak Takraw Men': 'sepak_takraw_men',
        'Sepak Takraw Women': 'sepak_takraw_women',
        'Table Tennis Men': 'table_tennis_men',
        'Table Tennis Women': 'table_tennis_women',
        'Chess Men': 'chess_men',
        'Chess Women': 'chess_women',
        'Taekwondo Men': 'taekwondo_men',
        'Taekwondo Women': 'taekwondo_women',
        'Arnis Men': 'arnis_men',
        'Arnis Women': 'arnis_women',
        'Gymnastic Men': 'gymnastic_men',
        'Gymnastic Women': 'gymnastic_women',
        
        // Athletics
        'Athletics - 100m Sprint Men': 'athletics_100m_men',
        'Athletics - 100m Sprint Women': 'athletics_100m_women',
        'Athletics - 200m Sprint Men': 'athletics_200m_men',
        'Athletics - 200m Sprint Women': 'athletics_200m_women',
        'Athletics - 400m Sprint Men': 'athletics_400m_men',
        'Athletics - 400m Sprint Women': 'athletics_400m_women',
        'Athletics - 800m Run Men': 'athletics_800m_men',
        'Athletics - 800m Run Women': 'athletics_800m_women',
        'Athletics - 1500m Run Men': 'athletics_1500m_men',
        'Athletics - 1500m Run Women': 'athletics_1500m_women',
        'Athletics - 5000m Run Men': 'athletics_5000m_men',
        'Athletics - 5000m Run Women': 'athletics_5000m_women',
        'Athletics - Long Jump Men': 'athletics_longjump_men',
        'Athletics - Long Jump Women': 'athletics_longjump_women',
        'Athletics - High Jump Men': 'athletics_highjump_men',
        'Athletics - High Jump Women': 'athletics_highjump_women',
        'Athletics - Triple Jump Men': 'athletics_triplejump_men',
        'Athletics - Triple Jump Women': 'athletics_triplejump_women',
        'Athletics - Shot Put Men': 'athletics_shotput_men',
        'Athletics - Shot Put Women': 'athletics_shotput_women',
        'Athletics - Javelin Throw Men': 'athletics_javelin_men',
        'Athletics - Javelin Throw Women': 'athletics_javelin_women',
        'Athletics - Discus Throw Men': 'athletics_discusthrow_men',
        'Athletics - Discus Throw Women': 'athletics_discusthrow_women',
        'Athletics - 4x100m Relay Men': 'athletics_4x100_men',
        'Athletics - 4x100m Relay Women': 'athletics_4x100_women',
        'Athletics - 4x400m Relay Men': 'athletics_4x400_men',
        'Athletics - 4x400m Relay Women': 'athletics_4x400_women',
        
        // Esports
        'Mobile Legends': 'ml',
        'CODM': 'codm',
        
        // Activities
        'Cheerdance': 'cheerdance',
        'Dance Competition': 'dance_competition',
        'Singing Contest': 'singing_contest'
    };

    return reverseSportMap[displayName] || displayName;
}

// Helper function to convert sport codes to display names
function convertSportCodesToDisplayNames(sportCodes) {
    const displayNames = [];
    
    const sportDisplayMap = {
        // Basketball
        'basketball_men': 'Basketball Men',
        'basketball_women': 'Basketball Women',
        
        // Volleyball
        'volleyball_men': 'Volleyball Men',
        'volleyball_women': 'Volleyball Women',
        
        // Soccer
        'soccer_men': 'Soccer Men',
        'soccer_women': 'Soccer Women',
        
        // Badminton
        'badminton_men': 'Badminton Men',
        'badminton_women': 'Badminton Women',
        
        // Other sports
        'sepak_takraw_men': 'Sepak Takraw Men',
        'sepak_takraw_women': 'Sepak Takraw Women',
        'table_tennis_men': 'Table Tennis Men',
        'table_tennis_women': 'Table Tennis Women',
        'chess_men': 'Chess Men',
        'chess_women': 'Chess Women',
        'taekwondo_men': 'Taekwondo Men',
        'taekwondo_women': 'Taekwondo Women',
        'arnis_men': 'Arnis Men',
        'arnis_women': 'Arnis Women',
        'gymnastic_men': 'Gymnastic Men',
        'gymnastic_women': 'Gymnastic Women',
        
        // Athletics
        'athletics_100m_men': 'Athletics - 100m Sprint Men',
        'athletics_100m_women': 'Athletics - 100m Sprint Women',
        'athletics_200m_men': 'Athletics - 200m Sprint Men',
        'athletics_200m_women': 'Athletics - 200m Sprint Women',
        'athletics_400m_men': 'Athletics - 400m Sprint Men',
        'athletics_400m_women': 'Athletics - 400m Sprint Women',
        'athletics_800m_men': 'Athletics - 800m Run Men',
        'athletics_800m_women': 'Athletics - 800m Run Women',
        'athletics_1500m_men': 'Athletics - 1500m Run Men',
        'athletics_1500m_women': 'Athletics - 1500m Run Women',
        'athletics_5000m_men': 'Athletics - 5000m Run Men',
        'athletics_5000m_women': 'Athletics - 5000m Run Women',
        'athletics_longjump_men': 'Athletics - Long Jump Men',
        'athletics_longjump_women': 'Athletics - Long Jump Women',
        'athletics_highjump_men': 'Athletics - High Jump Men',
        'athletics_highjump_women': 'Athletics - High Jump Women',
        'athletics_triplejump_men': 'Athletics - Triple Jump Men',
        'athletics_triplejump_women': 'Athletics - Triple Jump Women',
        'athletics_shotput_men': 'Athletics - Shot Put Men',
        'athletics_shotput_women': 'Athletics - Shot Put Women',
        'athletics_javelin_men': 'Athletics - Javelin Throw Men',
        'athletics_javelin_women': 'Athletics - Javelin Throw Women',
        'athletics_discusthrow_men': 'Athletics - Discus Throw Men',
        'athletics_discusthrow_women': 'Athletics - Discus Throw Women',
        'athletics_4x100_men': 'Athletics - 4x100m Relay Men',
        'athletics_4x100_women': 'Athletics - 4x100m Relay Women',
        'athletics_4x400_men': 'Athletics - 4x400m Relay Men',
        'athletics_4x400_women': 'Athletics - 4x400m Relay Women'
    };

    sportCodes.forEach(code => {
        if (sportDisplayMap[code]) {
            displayNames.push(sportDisplayMap[code]);
        } else {
            // For backward compatibility with old codes
            displayNames.push(code);
        }
    });

    return displayNames;
};



// Get Admin Coach
exports.getAdminCoach = async (req, res) => {
    try {
        const username = req.session.admin?.username;

        const [adminRows] = await db.execute("SELECT * FROM admins WHERE username = ?", [username]);
        const adminData = adminRows[0];

        if (adminData.profilePic) {
            adminData.profilePic = adminData.profilePic;
        }

        const coaches = await Admin.getPendingCoaches(); 
        
        res.render('admin/adminCoach', {
            coaches: coaches,
            admin: adminData
        });

    } catch (error) {
        console.error('Error fetching coaches:', error);
        req.flash('error', 'Error fetching coaches'); 
        res.redirect('/admin/dashboard');
    }
};



// Handle accepting or rejecting a coach's account
exports.updateCoachStatus = async (req, res) => {
    const { coachId, status } = req.body; 

    try {
        await Admin.updateCoachStatus(coachId, status);  
        res.redirect('/admin/coach');
    } catch (error) {
        console.error('Error updating coach status:', error);
        req.flash('error', 'Error updating coach status'); 
        res.redirect('/admin/coach');
    }
};


// Format date function 
function formatDate(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    let ampm = 'AM';

    if (hours >= 12) {
        ampm = 'PM';
        if (hours > 12) {
            hours -= 12;
        }
    } else if (hours === 0) {
        hours = 12;
    }

    const formattedDate = `${day}/${month}/${year}, ${hours}:${minutes} ${ampm}`;
    return formattedDate;
};

// New helper function for date-only formatting
function formatDateOnly(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
}


// Render the users page with all users
exports.getAdminUsers = async (req, res) => {
    try {
        const username = req.session.admin?.username;

        // Get admin profile data
        const [adminRows] = await db.execute("SELECT * FROM admins WHERE username = ?", [username]);
        const adminData = adminRows[0];

        if (adminData.profilePic) {
            adminData.profilePic = adminData.profilePic;
        }

        // Fetch users with all required data
        const [users] = await db.execute(`
            SELECT 
                u.id,
                u.email,
                u.profile,
                tp.id AS team_player_id, 
                tp.player_name,
                tp.sports,
                tp.age,
                tp.sex,
                tp.birthdate,
                tp.PSA,
                tp.waiver,
                tp.med_cert,
                tp.contact_number,
                tp.student_type,
                t.organization,
                tp.school,
                tp.barangay,
                tp.year_level,
                tp.COR,
                tp.COG,
                tp.TOR_previous_school,
                tp.entry_form,
                tp.COE,
                tp.authorization_letter,
                tp.school_id,
                tp.certification_lack_units,
                t.teamName,
                e.title AS event_title,
                tp.created_at
            FROM users u
            INNER JOIN team_players tp ON u.id = tp.user_id AND tp.status = 'confirmed'
            LEFT JOIN team t ON tp.team_id = t.id
            LEFT JOIN events e ON t.event_id = e.id
            ORDER BY tp.created_at DESC
        `);

        const formattedUsers = users.map(user => {
            // Use Cloudinary URLs directly as they're already stored in the database
            // No need to transform them since they're already full URLs
            return {
                ...user,
                team_player_id: user.team_player_id,
                created_at: formatDate(user.created_at),
                birthdate: user.birthdate ? formatDateOnly(user.birthdate) : 'N/A',
                // All document fields are already Cloudinary URLs from registration
                PSA: user.PSA,
                waiver: user.waiver,
                med_cert: user.med_cert,
                COR: user.COR,
                COG: user.COG,
                TOR_previous_school: user.TOR_previous_school,
                entry_form: user.entry_form,
                COE: user.COE,
                authorization_letter: user.authorization_letter,
                school_id: user.school_id,
                certification_lack_units: user.certification_lack_units,
                profile: user.profile // Also use profile URL directly
            };
        });

        // Render with admin data
        res.render('admin/adminUsers', { 
            users: formattedUsers,
            admin: adminData
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).send("Error fetching users");
    }
};

// Remove player
exports.removePlayer = async (req, res) => {
    try {
        const { player_id } = req.params;
        
        // First check if player exists in team_players table
        const [player] = await db.execute('SELECT * FROM team_players WHERE id = ?', [player_id]);
        if (!player.length) {
            return res.status(404).json({ success: false, message: 'Player not found in team roster' });
        }

        await db.execute('DELETE FROM team_players WHERE id = ?', [player_id]);
        
        res.json({ success: true, message: 'Player removed from team successfully' });
    } catch (error) {
        console.error("Error removing player:", error);
        res.status(500).json({ success: false, message: 'Failed to remove player' });
    }
};




// Get adminTeamRequest Page
exports.getAdminTeamRequest = async (req, res) => {
    if (!req.session.admin) {
        return res.redirect("/admin");
    }

    try {
        const username = req.session.admin.username;
        const [adminRows] = await db.execute("SELECT * FROM admins WHERE username = ?", [username]);
        const adminData = adminRows[0];

        if (adminData.profilePic) {
            adminData.profilePic = adminData.profilePic;
        }

        // Get pending teams with coach info
        const [pendingTeams] = await db.execute(`
            SELECT t.*, c.fullname AS coach_name, c.email, c.phone, c.position
            FROM team t
            LEFT JOIN coach c ON t.coach_id = c.id
            WHERE t.status = "pending"
        `);

        const formattedTeams = pendingTeams.map(team => {
            team.created_at = formatDate(team.created_at); 
            return team;
        });

        res.render('admin/adminTeamRequest', {
            teams: formattedTeams,
            messages: {},
            admin: adminData
        });
    } catch (error) {
        console.error("Error fetching pending teams:", error);
        res.render('admin/adminTeamRequest', { messages: { error: "There was an error fetching team requests." } });
    }
};

// Handle team request Process
exports.handleTeamRequest = async (req, res) => {
    const { teamId, action } = req.body;

    try {
        let status = action === "accept" ? "confirmed" : "rejected";
        await db.execute('UPDATE team SET status = ? WHERE id = ?', [status, teamId]);
        
        // If accepting, also update coach status if needed
        if (action === "accept") {
            await db.execute(`
                UPDATE coach c
                JOIN team t ON c.id = t.coach_id
                SET c.status = 'confirmed'
                WHERE t.id = ? AND c.status = 'pending'
            `, [teamId]);
        }
        
        res.redirect('/admin/team-request');
    } catch (error) {
        console.error("Error updating team request status:", error);
        res.render('admin/adminTeamRequest', { messages: { error: "There was an error processing the request." } });
    }
};






// Admin Get the registered teams
exports.getAdminRegisteredTeam = async (req, res) => {
    if (!req.session.admin) {
        return res.redirect("/admin");
    }

    try {
        const username = req.session.admin.username;
        
        // Get admin data
        const [adminRows] = await db.execute("SELECT * FROM admins WHERE username = ?", [username]);
        const adminData = adminRows[0];

        // Process profile picture if exists
        if (adminData.profilePic) {
            adminData.profilePic = `${adminData.profilePic}`;
        }

        // Get all events for the filter dropdown (ordered by newest first)
        const [events] = await db.execute(`
            SELECT id, title 
            FROM events 
            ORDER BY created_at DESC
        `);

        // Get teams with their event information
        const [confirmedTeams] = await db.execute(`
            SELECT 
                t.id,
                t.teamName,
                t.teamProfile,
                t.created_at,
                t.status,
                e.title AS event_title,
                e.id AS event_id
            FROM team t
            LEFT JOIN events e ON t.event_id = e.id
            WHERE t.status = "confirmed"
            ORDER BY t.created_at DESC
        `);

        // Format team data for the view
        const teams = confirmedTeams.map(team => {
            return {
                ...team,
                created_at: formatDate(team.created_at),
                teamProfile: team.teamProfile ? `${team.teamProfile}` : null,
                event_title: team.event_title || 'No event'
            };
        });

        res.render('admin/adminRegisteredTeam', {
            teams: teams,
            events: events, // Pass events to the view
            admin: adminData,
            messages: req.flash() || {}
        });

    } catch (error) {
        console.error("Error fetching confirmed teams:", error);
        req.flash('error', 'There was an error fetching registered teams. Please try again later.');
        res.render('admin/adminRegisteredTeam', {
            teams: [],
            events: [],
            admin: req.session.admin || null,
            messages: { error: "There was an error fetching registered teams." }
        });
    }
};








// Get Event History Page
exports.getEventHistory = async (req, res) => {
    if (!req.session.admin) {
        return res.redirect("/admin");
    }

    try {
        const adminId = req.session.admin.id;
        const [adminData] = await db.execute("SELECT * FROM admins WHERE id = ?", [adminId]);
        const admin = adminData[0];

        // Get all expired events
        const [expiredEvents] = await db.execute(
            "SELECT * FROM events WHERE status = 'expired' ORDER BY date_schedule DESC"
        );

        // Get tournament results for each event
        const eventsWithResults = await Promise.all(
            expiredEvents.map(async (event) => {
                // Get all completed brackets for this event
                const [brackets] = await db.execute(
                    `SELECT tb.*, tp.champion_team_id, t.teamName as champion_name
                     FROM tournament_brackets tb
                     LEFT JOIN tournament_progress tp ON tb.id = tp.bracket_id
                     LEFT JOIN team t ON tp.champion_team_id = t.id
                     WHERE tb.event_id = ? AND tp.is_completed = TRUE
                     ORDER BY tb.sport_type`,
                    [event.id]
                );

                // Group champions by sport type
                const sportsChampions = [];
                const esportsChampions = [];
                const otherActivitiesChampions = [];

                brackets.forEach(bracket => {
                    const championInfo = {
                        sport: bracket.sport_type,
                        champion: bracket.champion_name,
                        teamId: bracket.champion_team_id,
                        bracketType: bracket.bracket_type
                    };

                    // Check if this sport belongs to sports, esports, or other_activities
                    if (event.sports && event.sports.includes(bracket.sport_type)) {
                        sportsChampions.push(championInfo);
                    } else if (event.esports && event.esports.includes(bracket.sport_type)) {
                        esportsChampions.push(championInfo);
                    } else if (event.other_activities && event.other_activities.includes(bracket.sport_type)) {
                        otherActivitiesChampions.push(championInfo);
                    }
                });

                return {
                    ...event,
                    sportsChampions,
                    esportsChampions,
                    otherActivitiesChampions,
                    totalChampions: brackets.length
                };
            })
        );

        // Get notification data
        const newCoachRequests = await getPendingCoachNotifications();
        const newTeamRequests = await getPendingTeamNotifications();

        res.render('admin/eventHistory', {
            admin: admin,
            events: eventsWithResults,
            success: req.flash('success'),
            error: req.flash('error'),
            newCoachRequests: newCoachRequests,
            newTeamRequests: newTeamRequests
        });
    } catch (error) {
        console.error('Error loading event history:', error);
        req.flash('error', 'Error loading event history');
        res.redirect('/admin/home');
    }
};

// Get detailed event results - OPTIMIZED VERSION
exports.getEventResults = async (req, res) => {
    if (!req.session.admin) {
        return res.redirect("/admin");
    }

    try {
        const { eventId } = req.params;

        // Get event details
        const [events] = await db.execute(
            "SELECT * FROM events WHERE id = ?",
            [eventId]
        );

        if (events.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const event = events[0];

        // Get all brackets for this event
        const [brackets] = await db.execute(
            `SELECT tb.*, tp.champion_team_id, t.teamName as champion_name,
                    tp.current_round, tp.is_completed
             FROM tournament_brackets tb
             LEFT JOIN tournament_progress tp ON tb.id = tp.bracket_id
             LEFT JOIN team t ON tp.champion_team_id = t.id
             WHERE tb.event_id = ?
             ORDER BY tb.sport_type`,
            [eventId]
        );

        // Get match counts for each bracket separately
        const bracketsWithDetails = await Promise.all(
            brackets.map(async (bracket) => {
                // Get match statistics for this bracket
                const [matchStats] = await db.execute(
                    `SELECT 
                        COUNT(*) as total_matches,
                        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_matches
                     FROM matches 
                     WHERE bracket_id = ?`,
                    [bracket.id]
                );

                // Get all matches for this bracket
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

                // Calculate bracket statistics
                const totalTeams = new Set();
                matches.forEach(match => {
                    if (match.team1_id) totalTeams.add(match.team1_id);
                    if (match.team2_id) totalTeams.add(match.team2_id);
                });

                const stats = matchStats[0] || { total_matches: 0, completed_matches: 0 };

                return {
                    ...bracket,
                    matches: matches,
                    totalTeams: totalTeams.size,
                    total_matches: stats.total_matches,
                    completed_matches: stats.completed_matches,
                    completionRate: stats.total_matches > 0 ? 
                        Math.round((stats.completed_matches / stats.total_matches) * 100) : 0
                };
            })
        );

        res.json({
            event: event,
            brackets: bracketsWithDetails
        });
    } catch (error) {
        console.error('Error getting event results:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Export event results - IMPROVED VERSION (FIXED)
exports.exportEventResults = async (req, res) => {
    if (!req.session.admin) {
        return res.redirect("/admin");
    }

    try {
        const { eventId } = req.params;

        // Get event details
        const [events] = await db.execute(
            "SELECT * FROM events WHERE id = ?",
            [eventId]
        );

        if (events.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const event = events[0];

        // Get all brackets for this event with detailed information
        // REMOVED 'tb.status as bracket_status' since it doesn't exist
        const [brackets] = await db.execute(
            `SELECT 
                tb.id as bracket_id,
                tb.sport_type,
                tb.bracket_type,
                tp.champion_team_id,
                t.teamName as champion_name,
                c.fullname as coach_name,
                t.organization,
                tp.is_completed,
                tp.current_round,
                tp.total_rounds,
                DATE_FORMAT(tp.completed_at, '%Y-%m-%d %H:%i:%s') as completion_date
             FROM tournament_brackets tb
             LEFT JOIN tournament_progress tp ON tb.id = tp.bracket_id
             LEFT JOIN team t ON tp.champion_team_id = t.id
             LEFT JOIN coach c ON t.coach_id = c.id
             WHERE tb.event_id = ?
             ORDER BY tb.sport_type, tb.bracket_type`,
            [eventId]
        );

        // Get match statistics for each bracket
        const bracketsWithDetails = await Promise.all(
            brackets.map(async (bracket) => {
                // Get match count and statistics
                const [matchStats] = await db.execute(
                    `SELECT 
                        COUNT(*) as total_matches,
                        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_matches,
                        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled_matches,
                        SUM(CASE WHEN status = 'ongoing' THEN 1 ELSE 0 END) as ongoing_matches
                     FROM matches 
                     WHERE bracket_id = ?`,
                    [bracket.bracket_id]
                );

                // Get all matches with team details
                const [matches] = await db.execute(
                    `SELECT 
                        m.*,
                        t1.teamName as team1_name,
                        t2.teamName as team2_name,
                        t1.organization as team1_org,
                        t2.organization as team2_org,
                        winner.teamName as winner_name,
                        DATE_FORMAT(m.match_date, '%Y-%m-%d %H:%i:%s') as match_date_formatted,
                        DATE_FORMAT(m.completed_at, '%Y-%m-%d %H:%i:%s') as completed_date
                     FROM matches m
                     LEFT JOIN team t1 ON m.team1_id = t1.id
                     LEFT JOIN team t2 ON m.team2_id = t2.id
                     LEFT JOIN team winner ON m.winner_team_id = winner.id
                     WHERE m.bracket_id = ?
                     ORDER BY m.round_number, m.match_number`,
                    [bracket.bracket_id]
                );

                // Get all participating teams in this bracket
                const [participatingTeams] = await db.execute(
                    `SELECT DISTINCT 
                        t.id,
                        t.teamName,
                        t.organization,
                        c.fullname as coach_name
                     FROM matches m
                     JOIN team t ON (m.team1_id = t.id OR m.team2_id = t.id)
                     LEFT JOIN coach c ON t.coach_id = c.id
                     WHERE m.bracket_id = ?
                     ORDER BY t.teamName`,
                    [bracket.bracket_id]
                );

                return {
                    ...bracket,
                    match_stats: matchStats[0] || {
                        total_matches: 0,
                        completed_matches: 0,
                        scheduled_matches: 0,
                        ongoing_matches: 0
                    },
                    matches: matches,
                    participating_teams: participatingTeams,
                    completion_rate: matchStats[0] && matchStats[0].total_matches > 0 ? 
                        Math.round((matchStats[0].completed_matches / matchStats[0].total_matches) * 100) : 0,
                    // Add bracket status based on completion
                    bracket_status: bracket.is_completed ? 'Completed' : 'In Progress'
                };
            })
        );

        // Get event leaderboard data
        const leaderboardData = await getEventLeaderboardData(eventId);

        // Create comprehensive CSV content
        let csvContent = 'EVENT RESULTS REPORT\n';
        csvContent += '='.repeat(50) + '\n\n';
        
        // Event Information Section
        csvContent += 'EVENT INFORMATION\n';
        csvContent += '-' .repeat(30) + '\n';
        csvContent += `Event Title: ${event.title}\n`;
        csvContent += `Event Date: ${new Date(event.date_schedule).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        })}\n`;
        csvContent += `Location: ${event.location}\n`;
        csvContent += `Status: ${event.status}\n`;
        csvContent += `Description: ${event.description || 'N/A'}\n\n`;
        
        // Tournament Brackets Summary
        csvContent += 'TOURNAMENT BRACKETS SUMMARY\n';
        csvContent += '-' .repeat(30) + '\n';
        csvContent += 'Sport Type,Bracket Type,Status,Champion Team,Coach,Organization,Total Matches,Completed Matches,Completion Rate\n';
        
        bracketsWithDetails.forEach(bracket => {
            csvContent += `"${bracket.sport_type}","${bracket.bracket_type.replace(/_/g, ' ')}","${bracket.bracket_status}","${bracket.champion_name || 'N/A'}","${bracket.coach_name || 'N/A'}","${bracket.organization || 'N/A'}","${bracket.match_stats.total_matches}","${bracket.match_stats.completed_matches}","${bracket.completion_rate}%"\n`;
        });
        
        csvContent += '\n';
        
        // Detailed Match Results by Bracket
        csvContent += 'DETAILED MATCH RESULTS\n';
        csvContent += '='.repeat(50) + '\n';
        
        bracketsWithDetails.forEach((bracket, index) => {
            csvContent += `\n${index + 1}. ${bracket.sport_type.toUpperCase()} - ${bracket.bracket_type.replace(/_/g, ' ').toUpperCase()}\n`;
            csvContent += '-' .repeat(40) + '\n';
            
            if (bracket.matches.length === 0) {
                csvContent += 'No matches recorded for this bracket.\n';
            } else {
                csvContent += 'Round,Match,Team 1,Organization 1,Team 2,Organization 2,Winner,Score,Status,Match Date,Completed Date\n';
                
                bracket.matches.forEach(match => {
                    csvContent += `"${match.round_number}","${match.match_number}","${match.team1_name || 'N/A'}","${match.team1_org || 'N/A'}","${match.team2_name || 'N/A'}","${match.team2_org || 'N/A'}","${match.winner_name || 'N/A'}","${match.team1_score || 0}-${match.team2_score || 0}","${match.status}","${match.match_date_formatted || 'N/A'}","${match.completed_date || 'N/A'}"\n`;
                });
            }
            
            // Participating Teams for this bracket
            csvContent += `\nParticipating Teams (${bracket.participating_teams.length} teams):\n`;
            csvContent += 'Team Name,Organization,Coach\n';
            
            bracket.participating_teams.forEach(team => {
                csvContent += `"${team.teamName}","${team.organization || 'N/A'}","${team.coach_name || 'N/A'}"\n`;
            });
            
            csvContent += '\n';
        });
        
        // Event Leaderboard Section
        if (leaderboardData.length > 0) {
            csvContent += '\nEVENT LEADERBOARD\n';
            csvContent += '='.repeat(50) + '\n';
            
            // Aggregate leaderboard across all sports
            const teamStats = {};
            leaderboardData.forEach(lb => {
                if (!teamStats[lb.team_id]) {
                    teamStats[lb.team_id] = {
                        team_id: lb.team_id,
                        team_name: lb.team_name,
                        organization: lb.organization,
                        gold: 0,
                        silver: 0,
                        bronze: 0,
                        total_matches: 0,
                        wins: 0
                    };
                }
                
                teamStats[lb.team_id].gold += lb.gold || 0;
                teamStats[lb.team_id].silver += lb.silver || 0;
                teamStats[lb.team_id].bronze += lb.bronze || 0;
                teamStats[lb.team_id].total_matches += lb.total_matches || 0;
                teamStats[lb.team_id].wins += lb.wins || 0;
            });

            // Convert to array and calculate points and win rate
            const aggregatedLeaderboard = Object.values(teamStats).map(team => {
                team.total_points = (team.gold * 3) + (team.silver * 2) + (team.bronze * 1);
                team.win_rate = team.total_matches > 0 ? 
                    Math.min(Math.round((team.wins / team.total_matches) * 100), 100) : 0;
                return team;
            });

            // Sort by total points (descending)
            aggregatedLeaderboard.sort((a, b) => b.total_points - a.total_points);
            
            csvContent += '\nOVERALL LEADERBOARD (ALL SPORTS)\n';
            csvContent += '-' .repeat(30) + '\n';
            csvContent += 'Rank,Team Name,Organization,Gold Medals,Silver Medals,Bronze Medals,Total Points,Matches Played,Wins,Win Rate\n';
            
            aggregatedLeaderboard.forEach((team, index) => {
                const rank = index + 1;
                csvContent += `"${rank}","${team.team_name}","${team.organization || 'N/A'}","${team.gold}","${team.silver}","${team.bronze}","${team.total_points}","${team.total_matches}","${team.wins}","${team.win_rate}%"\n`;
            });
            
            // Leaderboard by Sport Type
            const sportsLeaderboards = {};
            leaderboardData.forEach(lb => {
                if (!sportsLeaderboards[lb.sport_type]) {
                    sportsLeaderboards[lb.sport_type] = [];
                }
                sportsLeaderboards[lb.sport_type].push(lb);
            });

            Object.keys(sportsLeaderboards).forEach(sport => {
                csvContent += `\n${sport.toUpperCase()} LEADERBOARD\n`;
                csvContent += '-' .repeat(30) + '\n';
                csvContent += 'Rank,Team Name,Organization,Gold Medals,Silver Medals,Bronze Medals,Total Points,Matches Played,Wins,Win Rate\n';
                
                const sportLeaderboard = sportsLeaderboards[sport]
                    .map(team => {
                        team.total_points = (team.gold * 3) + (team.silver * 2) + (team.bronze * 1);
                        team.win_rate = team.total_matches > 0 ? 
                            Math.min(Math.round((team.wins / team.total_matches) * 100), 100) : 0;
                        return team;
                    })
                    .sort((a, b) => b.total_points - a.total_points);
                
                sportLeaderboard.forEach((team, index) => {
                    const rank = index + 1;
                    csvContent += `"${rank}","${team.team_name}","${team.organization || 'N/A'}","${team.gold || 0}","${team.silver || 0}","${team.bronze || 0}","${team.total_points}","${team.total_matches || 0}","${team.wins || 0}","${team.win_rate}%"\n`;
                });
            });
        }
        
        // Final Summary
        csvContent += '\n\nEVENT SUMMARY\n';
        csvContent += '='.repeat(50) + '\n';
        csvContent += `Total Brackets: ${brackets.length}\n`;
        
        const completedBrackets = brackets.filter(b => b.is_completed).length;
        csvContent += `Completed Brackets: ${completedBrackets}\n`;
        
        const totalMatches = bracketsWithDetails.reduce((sum, b) => sum + b.match_stats.total_matches, 0);
        const completedMatches = bracketsWithDetails.reduce((sum, b) => sum + b.match_stats.completed_matches, 0);
        csvContent += `Total Matches: ${totalMatches}\n`;
        csvContent += `Completed Matches: ${completedMatches}\n`;
        csvContent += `Overall Completion Rate: ${totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0}%\n\n`;
        
        csvContent += `Report Generated: ${new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })}\n`;
        csvContent += 'Generated by: SLAMS Tournament Management System\n';

        // Set response headers for file download
        const fileName = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_detailed_results_${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(csvContent);

    } catch (error) {
        console.error('Error exporting event results:', error);
        req.flash('error', 'Error exporting event results');
        res.redirect('/admin/event-history');
    }
};






// Get Event Leaderboard
exports.getEventLeaderboard = async (req, res) => {
    if (!req.session.admin) {
        return res.redirect("/admin");
    }

    try {
        const { eventId } = req.params;

        // Get event details
        const [events] = await db.execute(
            "SELECT * FROM events WHERE id = ?",
            [eventId]
        );

        if (events.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const event = events[0];

        // Get leaderboard data for this event
        const leaderboardData = await getEventLeaderboardData(eventId);

        res.json({
            event: event,
            leaderboards: leaderboardData
        });
    } catch (error) {
        console.error('Error getting event leaderboard:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Helper function to get leaderboard data
async function getEventLeaderboardData(eventId) {
    // Get all brackets for the event
    const [brackets] = await db.execute(
        "SELECT * FROM tournament_brackets WHERE event_id = ?",
        [eventId]
    );

    const leaderboardData = [];

    for (const bracket of brackets) {
        // Get all teams that participated in this bracket
        const [participatingTeams] = await db.execute(
            `SELECT DISTINCT t.id, t.teamName, t.teamProfile, t.organization
             FROM matches m
             JOIN team t ON (m.team1_id = t.id OR m.team2_id = t.id)
             WHERE m.bracket_id = ?`,
            [bracket.id]
        );

        for (const team of participatingTeams) {
            // Get match statistics for this team in this bracket
            const [matchStats] = await db.execute(
                `SELECT 
                    COUNT(*) as total_matches,
                    SUM(CASE WHEN m.winner_team_id = ? THEN 1 ELSE 0 END) as wins,
                    SUM(CASE WHEN m.status = 'completed' AND m.winner_team_id = ? THEN 1 ELSE 0 END) as completed_wins
                 FROM matches m
                 WHERE m.bracket_id = ? AND (m.team1_id = ? OR m.team2_id = ?)`,
                [team.id, team.id, bracket.id, team.id, team.id]
            );

            // Get medal counts (championships)
            const [medalStats] = await db.execute(
                `SELECT 
                    SUM(CASE WHEN tp.champion_team_id = ? THEN 1 ELSE 0 END) as gold,
                    SUM(CASE WHEN m.winner_team_id != ? AND (m.team1_id = ? OR m.team2_id = ?) 
                           AND m.round_number = (SELECT MAX(round_number) FROM matches WHERE bracket_id = ?) THEN 1 ELSE 0 END) as silver,
                    SUM(CASE WHEN m.winner_team_id != ? AND (m.team1_id = ? OR m.team2_id = ?) 
                           AND m.round_number = (SELECT MAX(round_number)-1 FROM matches WHERE bracket_id = ?) THEN 1 ELSE 0 END) as bronze
                 FROM tournament_progress tp
                 LEFT JOIN matches m ON tp.bracket_id = m.bracket_id
                 WHERE tp.bracket_id = ? AND (m.team1_id = ? OR m.team2_id = ?)`,
                [team.id, team.id, team.id, team.id, bracket.id, 
                 team.id, team.id, team.id, bracket.id, bracket.id, team.id, team.id]
            );

            const stats = matchStats[0] || { total_matches: 0, wins: 0, completed_wins: 0 };
            const medals = medalStats[0] || { gold: 0, silver: 0, bronze: 0 };

            leaderboardData.push({
                team_id: team.id,
                team_name: team.teamName,
                team_profile: team.teamProfile,
                organization: team.organization,
                sport_type: bracket.sport_type,
                total_matches: stats.total_matches,
                wins: stats.wins,
                gold: medals.gold,
                silver: medals.silver,
                bronze: medals.bronze
            });
        }
    }

    return leaderboardData;
}

// Update getEventHistory to include leaderboard data
exports.getEventHistory = async (req, res) => {
    if (!req.session.admin) {
        return res.redirect("/admin");
    }

    try {
        const adminId = req.session.admin.id;
        const [adminData] = await db.execute("SELECT * FROM admins WHERE id = ?", [adminId]);
        const admin = adminData[0];

        // Get all expired events
        const [expiredEvents] = await db.execute(
            "SELECT * FROM events WHERE status = 'expired' ORDER BY date_schedule DESC"
        );

        // Get tournament results and leaderboards for each event
        const eventsWithResults = await Promise.all(
            expiredEvents.map(async (event) => {
                // Get all completed brackets for this event
                const [brackets] = await db.execute(
                    `SELECT tb.*, tp.champion_team_id, t.teamName as champion_name
                     FROM tournament_brackets tb
                     LEFT JOIN tournament_progress tp ON tb.id = tp.bracket_id
                     LEFT JOIN team t ON tp.champion_team_id = t.id
                     WHERE tb.event_id = ? AND tp.is_completed = TRUE
                     ORDER BY tb.sport_type`,
                    [event.id]
                );

                // Group champions by sport type
                const sportsChampions = [];
                const esportsChampions = [];
                const otherActivitiesChampions = [];

                brackets.forEach(bracket => {
                    const championInfo = {
                        sport: bracket.sport_type,
                        champion: bracket.champion_name,
                        teamId: bracket.champion_team_id,
                        bracketType: bracket.bracket_type
                    };

                    // Check if this sport belongs to sports, esports, or other_activities
                    if (event.sports && event.sports.includes(bracket.sport_type)) {
                        sportsChampions.push(championInfo);
                    } else if (event.esports && event.esports.includes(bracket.sport_type)) {
                        esportsChampions.push(championInfo);
                    } else if (event.other_activities && event.other_activities.includes(bracket.sport_type)) {
                        otherActivitiesChampions.push(championInfo);
                    }
                });

                // Get leaderboard data for this event
                const leaderboards = await getEventLeaderboardData(event.id);

                return {
                    ...event,
                    sportsChampions,
                    esportsChampions,
                    otherActivitiesChampions,
                    totalChampions: brackets.length,
                    leaderboards: leaderboards
                };
            })
        );

        // Get notification data
        const newCoachRequests = await getPendingCoachNotifications();
        const newTeamRequests = await getPendingTeamNotifications();

        res.render('admin/eventHistory', {
            admin: admin,
            events: eventsWithResults,
            success: req.flash('success'),
            error: req.flash('error'),
            newCoachRequests: newCoachRequests,
            newTeamRequests: newTeamRequests
        });
    } catch (error) {
        console.error('Error loading event history:', error);
        req.flash('error', 'Error loading event history');
        res.redirect('/admin/home');
    }
};





// Get All Users Page
exports.getAllUsers = async (req, res) => {
    if (!req.session.admin) {
        return res.redirect("/admin");
    }

    try {
        const adminId = req.session.admin.id;
        const [adminData] = await db.execute("SELECT * FROM admins WHERE id = ?", [adminId]);
        const admin = adminData[0];

        // Get all users from users table
        const [users] = await db.execute(`
            SELECT id, email, profile, google_id, created_at, updated_at, 
                   terms_accepted, terms_accepted_at 
            FROM users 
            ORDER BY created_at DESC
        `);

        // Calculate statistics
        const totalUsers = users.length;
        const termsAcceptedUsers = users.filter(user => user.terms_accepted).length;
        const termsPendingUsers = totalUsers - termsAcceptedUsers;
        const googleUsers = users.filter(user => user.google_id).length;

        // Get notification data
        const newCoachRequests = await getPendingCoachNotifications();
        const newTeamRequests = await getPendingTeamNotifications();

        res.render('admin/adminAllUsers', {
            admin: admin,
            users: users,
            totalUsers: totalUsers,
            termsAcceptedUsers: termsAcceptedUsers,
            termsPendingUsers: termsPendingUsers,
            googleUsers: googleUsers,
            success: req.flash('success'),
            error: req.flash('error'),
            newCoachRequests: newCoachRequests,
            newTeamRequests: newTeamRequests
        });
    } catch (error) {
        console.error('Error loading all users:', error);
        req.flash('error', 'Error loading users data');
        res.redirect('/admin/home');
    }
};


























