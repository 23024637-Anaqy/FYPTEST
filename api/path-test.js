const express = require('express');
const mongoose = require('mongoose');

module.exports = async (req, res) => {
    console.log('=== PATH TEST ENDPOINT ===');
    console.log('Current working directory:', process.cwd());
    console.log('__dirname:', __dirname);
    console.log('__filename:', __filename);
    
    const fs = require('fs');
    const path = require('path');
    
    try {
        // Test various path configurations
        const paths = [
            '../routes/auth-mongo.js',
            './routes/auth-mongo.js', 
            '../routes/',
            '../models/',
            '../config/',
            '../middleware/'
        ];
        
        const pathTests = {};
        
        for (const testPath of paths) {
            try {
                const fullPath = path.join(__dirname, testPath);
                const exists = fs.existsSync(fullPath);
                pathTests[testPath] = {
                    fullPath,
                    exists,
                    isDirectory: exists ? fs.statSync(fullPath).isDirectory() : false
                };
                console.log(`Path test: ${testPath} -> ${exists ? 'EXISTS' : 'NOT FOUND'}`);
            } catch (error) {
                pathTests[testPath] = { error: error.message };
                console.log(`Path test error: ${testPath} -> ${error.message}`);
            }
        }
        
        // Test module loading
        const moduleTests = {};
        try {
            require('../routes/auth-mongo');
            moduleTests.authRoutes = 'SUCCESS';
            console.log('Module test: auth-mongo -> SUCCESS');
        } catch (error) {
            moduleTests.authRoutes = error.message;
            console.log('Module test: auth-mongo -> ERROR:', error.message);
        }
        
        res.json({
            timestamp: new Date().toISOString(),
            cwd: process.cwd(),
            dirname: __dirname,
            filename: __filename,
            pathTests,
            moduleTests,
            environment: process.env.NODE_ENV
        });
        
    } catch (error) {
        console.error('Path test endpoint error:', error);
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
};
