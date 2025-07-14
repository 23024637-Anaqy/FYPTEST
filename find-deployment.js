// Script to find your Vercel deployment URL
const https = require('https');

const projectId = 'prj_jdWHCZ3scCFuOD7Xb6VuN6Cgb4AZ';

// Common Vercel URL patterns for your project
const possibleUrls = [
    'https://fyptestin-23024637-anaqy.vercel.app',
    'https://fyptestin.vercel.app',
    'https://fyptest-23024637-anaqy.vercel.app',
    'https://fyptest.vercel.app',
    `https://fyptestin-git-main-23024637-anaqy.vercel.app`,
    `https://fyptest-git-main-23024637-anaqy.vercel.app`
];

async function findWorkingUrl() {
    console.log('🔍 Searching for your Vercel deployment...\n');
    
    for (const url of possibleUrls) {
        try {
            console.log(`📡 Testing: ${url}`);
            const response = await testUrl(`${url}/api/health`);
            
            if (response.includes('"status":"OK"') || response.includes('status: "OK"')) {
                console.log(`✅ FOUND IT! Your deployment is at: ${url}\n`);
                
                console.log('🎯 Debug URLs:');
                console.log(`   Health Check: ${url}/api/health`);
                console.log(`   MongoDB Test: ${url}/api/mongodb-test`);
                console.log(`   Logs Test: ${url}/api/logs-test`);
                console.log(`   Path Test: ${url}/api/path-test`);
                console.log(`   Login Debug: ${url}/api/debug-login`);
                console.log(`   Verbose Debug: ${url}/api/debug-verbose`);
                console.log(`\n🏀 Main App: ${url}`);
                
                return url;
            }
        } catch (error) {
            console.log(`   ❌ ${error.message}`);
        }
    }
    
    console.log('\n❌ No working deployment found. Check Vercel dashboard manually.');
    console.log('   Dashboard: https://vercel.com/dashboard');
    console.log(`   Project ID: ${projectId}`);
    return null;
}

function testUrl(url) {
    return new Promise((resolve, reject) => {
        const request = https.get(url, { timeout: 5000 }, (response) => {
            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', () => {
                if (response.statusCode === 200) {
                    resolve(data);
                } else {
                    reject(new Error(`HTTP ${response.statusCode}`));
                }
            });
        });
        
        request.on('error', reject);
        request.on('timeout', () => {
            request.destroy();
            reject(new Error('Timeout'));
        });
    });
}

findWorkingUrl().catch(console.error);
