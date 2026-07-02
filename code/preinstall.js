const fs = require('fs');
console.log("Running preinstall.js");

if (process.env.LIDA_CI) {
	if (!process.env.LIDA_ENV_B64 || !process.env.LIDA_GOOGLE_SERVICES_B64) {
		console.log('☒ LIDA_CI is set but LIDA_ENV_B64 or LIDA_GOOGLE_SERVICES_B64 is missing');
		process.exit(1);
	}
	fs.writeFileSync('.env', Buffer.from(process.env.LIDA_ENV_B64, 'base64'));
	console.log('✅ Wrote .env from LIDA_ENV_B64');
	fs.writeFileSync('google-services.json', Buffer.from(process.env.LIDA_GOOGLE_SERVICES_B64, 'base64'));
	console.log('✅ Wrote google-services.json from LIDA_GOOGLE_SERVICES_B64');
}

fs.readFile('app.config.js', 'utf8', function (err, data) {
	if (err) {
          console.log("☒ Could not load app.config.js");
		return console.log(err);
	} else {
		console.log('✅ Found app.config.js');
		const result = data.replace('../app-configs/google-services.json', process.env.GOOGLE_SERVICES_JSON);
		fs.writeFile('app.config.js', result, 'utf8', function (err) {
			if (err) {
				return console.log(err);
			}
			console.log('✅ Updated app.config.js with Google Services JSON file');
		});
	}
});
