const fs = require('fs')

if (process.env.PORT) {

    const privateKey = fs.readFileSync(
        '/etc/letsencrypt/live/ho-bolt.shop/privkey.pem',
        'utf8'
    );
    const certificate = fs.readFileSync(
        '/etc/letsencrypt/live/ho-bolt.shop/cert.pem',
        'utf8'
    );
    const ca = fs.readFileSync(
        '/etc/letsencrypt/live/ho-bolt.shop/chain.pem',
        'utf8'
    );

    const credentials = { key: privateKey, cert: certificate, ca: ca };
}
