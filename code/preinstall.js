const fs = require('fs');
console.log("Running preinstall.js");

const gsj = process.env.GOOGLE_SERVICES_JSON;
let gsjUsable = false;
if (gsj && gsj !== '/' && gsj !== '') {
	try {
		gsjUsable = fs.statSync(gsj).isFile();
	} catch (e) {
		gsjUsable = false;
	}
}
if (gsjUsable) {
	try {
		const data = fs.readFileSync('app.config.js', 'utf8');
		const result = data.replace('../app-configs/google-services.json', gsj);
		fs.writeFileSync('app.config.js', result, 'utf8');
		console.log('✅ Updated app.config.js with Google Services JSON file from env');
	} catch (err) {
		console.log('☒ Could not update app.config.js');
		console.log(err);
	}
} else {
	console.log('ℹ️  GOOGLE_SERVICES_JSON not a usable file path; leaving local path in app.config.js');
}

const apiKeys = ['API_KEY_1', 'API_KEY_2', 'API_KEY_3', 'API_KEY_4', 'API_KEY_5'];
const missing = apiKeys.filter((k) => !process.env[k]);
if (missing.length) {
	console.log('☒ Missing API key env vars: ' + missing.join(', '));
	console.log('   Falling back to whatever .env was shipped with the project.');
} else {
	let env = '';
	try {
		env = fs.readFileSync('.env', 'utf8');
	} catch (e) {}
	for (const k of apiKeys) {
		const line = k + '=' + process.env[k];
		const re = new RegExp('^' + k + '=.*$', 'm');
		if (re.test(env)) {
			env = env.replace(re, line);
		} else {
			if (env.length && !env.endsWith('\n')) env += '\n';
			env += line + '\n';
		}
	}
	fs.writeFileSync('.env', env, 'utf8');
	console.log('✅ Wrote API_KEY_1..5 to .env from EAS env');
}
