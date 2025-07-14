const https = require('https');

async function checkDeployment() {
    console.log('🔍 Checking Vercel deployment status...');
    
    // Check if we can find the deployment URL
    const possibleUrls = [
        'https://fyptestin.vercel.app',
        'https://fyptestin-git-main-23024637-anaqy.vercel.app',
        'https://fyptestin-23024637-anaqy.vercel.app'
    ];
    
    for (const url of possibleUrls) {
        try {
            console.log(`\n📡 Testing: ${url}`);
            
            // Test basic endpoint
            await testEndpoint(`${url}/api/logs-test`);
            
            // Test debug endpoint
            await testEndpoint(`${url}/api/debug-verbose`);
            
            console.log(`✅ ${url} is working!`);
            return url;
        } catch (error) {
            console.log(`❌ ${url} failed: ${error.message}`);
        }
    }
    
    console.log('\n❌ No working deployment found');
    return null;
}

function testEndpoint(url) {
    return new Promise((resolve, reject) => {
        const request = https.get(url, (response) => {
            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', () => {
                console.log(`   Status: ${response.statusCode}`);
                if (response.statusCode === 200) {
                    try {
                        const parsed = JSON.parse(data);
                        console.log(`   Response: ${parsed.message || 'OK'}`);
                    } catch {
                        console.log(`   Response: ${data.substring(0, 100)}...`);
                    }
                    resolve(data);
                } else {
                    reject(new Error(`HTTP ${response.statusCode}`));
                }
            });
        });
        
        request.on('error', reject);
        request.setTimeout(10000, () => reject(new Error('Timeout')));
    });
}

checkDeployment()
    .then(url => {
        if (url) {
            console.log(`\n🎯 Your working deployment: ${url}`);
            console.log(`\n📋 Debug URLs:`);
            console.log(`   Logs Test: ${url}/api/logs-test`);
            console.log(`   Debug Verbose: ${url}/api/debug-verbose`);
            console.log(`   Login Debug: ${url}/api/debug-login`);
            console.log(`\n💡 Visit these URLs to see runtime logs and debug info!`);
        }
    })
    .catch(console.error);
