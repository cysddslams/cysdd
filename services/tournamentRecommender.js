const db = require('../config/db');

class TournamentRecommender {
    constructor() {
        // Rule-based system with match calculations
        this.formatCalculations = {
            'single_elimination': (n) => n - 1, // Matches needed
            'double_elimination': (n) => 2 * n - 1,
            'round_robin': (n) => (n * (n - 1)) / 2
        };

        // Format preferences based on team count (can be learned over time)
        this.formatPreferences = new Map();
        
        // Track historical decisions
        this.history = [];
    }

    // Calculate match counts for all formats
    calculateMatchCounts(numTeams) {
        return {
            single_elimination: this.formatCalculations.single_elimination(numTeams),
            double_elimination: this.formatCalculations.double_elimination(numTeams),
            round_robin: this.formatCalculations.round_robin(numTeams)
        };
    }

    // Get optimal format recommendation
    async getRecommendation(eventId, sportType, selectedTeamIds) {
        const numTeams = selectedTeamIds.length;
        
        // Check for special cases first
        if (numTeams === 2) {
            return this.generateRecommendation('single_elimination', numTeams, 95);
        }
        
        if (numTeams === 3 || numTeams === 4) {
            return this.generateRecommendation('round_robin', numTeams, 85);
        }
        
        // Get historical data to improve recommendations
        const historicalData = await this.getHistoricalData(sportType);
        const learnedPreferences = await this.analyzeHistoricalData(historicalData, numTeams);
        
        // Determine best format
        let recommendedFormat = 'single_elimination';
        let confidence = 70;
        
        if (numTeams <= 8) {
            // Small tournaments: round robin is good
            recommendedFormat = 'round_robin';
            confidence = 80;
        } else if (numTeams <= 16) {
            // Medium tournaments: single elimination
            recommendedFormat = 'single_elimination';
            confidence = 85;
        } else {
            // Large tournaments: definitely single elimination
            recommendedFormat = 'single_elimination';
            confidence = 90;
        }
        
        // Adjust based on learned preferences
        if (learnedPreferences.bestFormat) {
            recommendedFormat = learnedPreferences.bestFormat;
            confidence = Math.min(95, confidence + 10);
        }
        
        // Generate complete recommendation
        return {
            recommendation: await this.generateCompleteRecommendation(recommendedFormat, numTeams, confidence, learnedPreferences),
            alternatives: await this.generateAlternatives(numTeams, recommendedFormat),
            analysis: this.generateAnalysis(numTeams, sportType)
        };
    }

    // Generate complete recommendation object
    async generateCompleteRecommendation(format, numTeams, confidence, learnedData) {
        const matchCounts = this.calculateMatchCounts(numTeams);
        
        return {
            format: format,
            recommendation: '✅ RECOMMENDED',
            matches: matchCounts[format],
            rounds: this.calculateRounds(format, numTeams),
            confidence: confidence,
            description: this.getFormatDescription(format, numTeams, matchCounts[format]),
            reason: this.getRecommendationReason(format, numTeams, learnedData),
            learningBased: learnedData.usedLearning || false
        };
    }

    // Generate alternative format options
    async generateAlternatives(numTeams, primaryFormat) {
        const matchCounts = this.calculateMatchCounts(numTeams);
        const alternatives = [];
        
        const allFormats = ['single_elimination', 'round_robin', 'double_elimination'];
        
        for (const format of allFormats) {
            if (format === primaryFormat) continue;
            
            const matchCount = matchCounts[format];
            let recommendation = '⚠️ ALTERNATIVE';
            let warning = '';
            
            if (format === 'round_robin' && numTeams > 8) {
                recommendation = '❌ NOT RECOMMENDED';
                warning = `${matchCount} matches would be too many for ${numTeams} teams`;
            } else if (format === 'double_elimination' && numTeams > 16) {
                recommendation = '❌ NOT RECOMMENDED';
                warning = `${matchCount} matches - too complex for ${numTeams} teams`;
            } else if (format === 'round_robin' && numTeams <= 4) {
                recommendation = '✅ ALSO GOOD';
            }
            
            alternatives.push({
                format: format,
                recommendation: recommendation,
                matches: matchCount,
                rounds: this.calculateRounds(format, numTeams),
                warning: warning,
                description: this.getFormatDescription(format, numTeams, matchCount)
            });
        }
        
        return alternatives;
    }

    // Calculate rounds for each format
    calculateRounds(format, numTeams) {
        switch(format) {
            case 'single_elimination':
                return Math.ceil(Math.log2(numTeams));
            case 'double_elimination':
                return Math.ceil(Math.log2(numTeams)) * 2;
            case 'round_robin':
                return 1;
            default:
                return 1;
        }
    }

    // Get format description
    getFormatDescription(format, numTeams, matches) {
        const descriptions = {
            'single_elimination': `Single Elimination - Best for ${numTeams} teams (${matches} matches, ${this.calculateRounds(format, numTeams)} rounds)`,
            'double_elimination': `Double Elimination - ${matches} matches, ${this.calculateRounds(format, numTeams)} rounds`,
            'round_robin': `Round Robin - ${matches} matches total`
        };
        return descriptions[format] || 'Tournament format';
    }

    // Get recommendation reason
    getRecommendationReason(format, numTeams, learnedData) {
        const reasons = {
            'single_elimination': `Fastest option for ${numTeams} teams. Quick elimination, minimum matches.`,
            'round_robin': `Every team plays each other. Best for small groups up to 8 teams.`,
            'double_elimination': `Teams get second chance. More matches but fairer results.`
        };
        
        let reason = reasons[format] || 'Optimal format based on team count.';
        
        if (learnedData.usedLearning) {
            reason += ` [Learning: Based on ${learnedData.similarCases} similar past tournaments]`;
        }
        
        return reason;
    }

    // Generate analysis data
    generateAnalysis(numTeams, sportType) {
        const matchCounts = this.calculateMatchCounts(numTeams);
        const dailyCapacity = this.calculateDailyCapacity(sportType);
        
        return {
            teamCount: numTeams,
            matchCounts: matchCounts,
            dailyCapacity: dailyCapacity,
            estimatedDays: Math.ceil(matchCounts.round_robin / dailyCapacity.maxMatchesPerDay),
            complexity: this.calculateComplexityScore(numTeams)
        };
    }

    // Calculate daily match capacity based on sport
    calculateDailyCapacity(sportType) {
        const sportDurations = {
            'basketball': 40,
            'volleyball': 45,
            'badminton': 30,
            'chess': 60,
            'ml': 25,
            'codm': 20,
            'default': 45
        };
        
        const matchDuration = sportDurations[sportType?.toLowerCase()] || sportDurations.default;
        const availableHours = 8;
        const maxMatches = Math.floor((availableHours * 60) / matchDuration);
        
        return {
            maxMatchesPerDay: maxMatches,
            matchDuration: matchDuration,
            sportType: sportType
        };
    }

    // Calculate complexity score (lower is better)
    calculateComplexityScore(numTeams) {
        const scores = {
            'single_elimination': numTeams <= 16 ? 'Low' : 'Medium',
            'round_robin': numTeams <= 8 ? 'Low' : 'Very High',
            'double_elimination': numTeams <= 8 ? 'Medium' : 'High'
        };
        return scores;
    }

    // Get historical data for learning
    async getHistoricalData(sportType) {
        try {
            // Create recommendations table if it doesn't exist
            await this.createRecommendationsTable();
            
            const [data] = await db.execute(
                `SELECT num_teams, recommended_format, admin_choice, matches_created 
                 FROM tournament_recommendations 
                 WHERE sport_type LIKE ? 
                 ORDER BY created_at DESC LIMIT 50`,
                [`%${sportType}%`]
            );
            return data;
        } catch (error) {
            console.error('Error fetching historical data:', error);
            return [];
        }
    }

    // Analyze historical data to learn patterns
    async analyzeHistoricalData(historicalData, currentTeamCount) {
        if (historicalData.length === 0) {
            return { bestFormat: null, usedLearning: false, similarCases: 0 };
        }
        
        // Find similar cases (±2 teams)
        const similarCases = historicalData.filter(item => 
            Math.abs(item.num_teams - currentTeamCount) <= 2
        );
        
        if (similarCases.length === 0) {
            return { bestFormat: null, usedLearning: false, similarCases: 0 };
        }
        
        // Count format preferences in similar cases
        const formatCounts = {};
        similarCases.forEach(case_ => {
            const format = case_.admin_choice || case_.recommended_format;
            if (format) {
                formatCounts[format] = (formatCounts[format] || 0) + 1;
            }
        });
        
        // Find most common format
        let bestFormat = null;
        let maxCount = 0;
        
        for (const [format, count] of Object.entries(formatCounts)) {
            if (count > maxCount) {
                maxCount = count;
                bestFormat = format;
            }
        }
        
        return { 
            bestFormat: bestFormat, 
            usedLearning: true, 
            similarCases: similarCases.length 
        };
    }

    // Store recommendation for future learning
    async storeRecommendation(eventId, sportType, numTeams, selectedTeams, recommendedFormat, confidence) {
        try {
            // Create table if it doesn't exist
            await this.createRecommendationsTable();
            
            const factors = {
                teamCount: numTeams,
                sportType: sportType,
                confidence: confidence,
                selectedTeams: selectedTeams.length,
                timestamp: new Date().toISOString()
            };
            
            const [result] = await db.execute(
                `INSERT INTO tournament_recommendations 
                (event_id, sport_type, num_teams, recommended_format, confidence_score, factors_considered) 
                VALUES (?, ?, ?, ?, ?, ?)`,
                [eventId, sportType, numTeams, recommendedFormat, confidence, JSON.stringify(factors)]
            );
            
            return result.insertId;
        } catch (error) {
            console.error('Error storing recommendation:', error);
            return null;
        }
    }

    // Record admin's final choice
    async recordAdminChoice(recommendationId, adminChoice, selectedTeams, eventId) {
        try {
            const numTeams = selectedTeams.length;
            const matchCounts = this.calculateMatchCounts(numTeams);
            const matchesCreated = matchCounts[adminChoice] || 0;
            
            await db.execute(
                `UPDATE tournament_recommendations 
                 SET admin_choice = ?, matches_created = ?, updated_at = NOW()
                 WHERE id = ?`,
                [adminChoice, matchesCreated, recommendationId]
            );
            
            return true;
        } catch (error) {
            console.error('Error recording admin choice:', error);
            return false;
        }
    }

    // Create recommendations table if it doesn't exist
    async createRecommendationsTable() {
        try {
            await db.execute(`
                CREATE TABLE IF NOT EXISTS tournament_recommendations (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    event_id INT NOT NULL,
                    sport_type VARCHAR(100) NOT NULL,
                    num_teams INT NOT NULL,
                    recommended_format VARCHAR(50) NOT NULL,
                    confidence_score FLOAT DEFAULT 0.0,
                    factors_considered JSON,
                    admin_choice VARCHAR(50) DEFAULT NULL,
                    matches_created INT DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_event (event_id),
                    INDEX idx_sport (sport_type),
                    INDEX idx_teams (num_teams)
                )
            `);
            console.log('Tournament recommendations table ready');
        } catch (error) {
            console.error('Error creating recommendations table:', error);
        }
    }

    // Get success statistics
    async getSuccessStatistics() {
        try {
            const [stats] = await db.execute(`
                SELECT 
                    COUNT(*) as total_recommendations,
                    COUNT(CASE WHEN admin_choice IS NOT NULL THEN 1 END) as admin_decisions,
                    COUNT(CASE WHEN admin_choice = recommended_format THEN 1 END) as accepted_recommendations,
                    AVG(confidence_score) as avg_confidence
                FROM tournament_recommendations
            `);
            
            return stats[0] || { total_recommendations: 0, admin_decisions: 0, accepted_recommendations: 0, avg_confidence: 0 };
        } catch (error) {
            console.error('Error getting success statistics:', error);
            return { total_recommendations: 0, admin_decisions: 0, accepted_recommendations: 0, avg_confidence: 0 };
        }
    }
}

module.exports = new TournamentRecommender();
