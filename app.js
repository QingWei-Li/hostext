require('dotenv').config();

const fastify = require('fastify')();
const md5 = require('md5');
const COS = require('cos-nodejs-sdk-v5');

const cos = new COS({
  Bucket: process.env.BUCKET,
  SecretId: process.env.SECRETID,
  SecretKey: process.env.SECRETKEY
});

// Body limit: 256KB
fastify.register(require('fastify-formbody'), { bodyLimit: 1024 * 256 });

fastify.get('/', (req, reply) => {
  let text = `Text hosting service\n\nCommond Line\n  curl -d text='any words' https://text.cinwell.com\n`;

  if (!/^curl/.test(req.headers['user-agent'])) {
    text =
      `<pre>${text}\nOnline<pre>` +
      '<form method=post><textarea name=text></textarea><div><input type=submit></div></form>';
    reply.header('content-type', 'text/html');
  }
  reply.send(text);
});

fastify.post('/', (req, reply) => {
  const { text } = req.body;
  const hash = md5(text).slice(0, 8);

  cos.putObject(
    {
      Bucket: process.env.BUCKET,
      Region: 'ap-guangzhou',
      Key: hash,
      ContentType: 'text/plain',
      CacheControl: 'max-age: 31536000',
      Body: Buffer.from(text)
    },
    (err, data) => {
      if (err) {
        reply.code = 400;
        reply.send(err);
      } else {
        reply.send(`curl https://text.cinwell.com/${hash}\n`);
      }
    }
  );
});

fastify.listen(4930, '0.0.0.0', err => {
  if (err) throw err;
  console.log(`server listening on ${fastify.server.address().port}`);
});
