require('dotenv').config();

const fastify = require('fastify')();
const md5 = require('md5');
const COS = require('cos-nodejs-sdk-v5');

const cos = new COS({
  Bucket: process.env.BUCKET,
  SecretId: process.env.SECRETID,
  SecretKey: process.env.SECRETKEY
});

function isCURL(req) {
  return /^curl/.test(req.headers['user-agent']);
}

// Body limit: 256KB
fastify.register(require('fastify-formbody'), { bodyLimit: 1024 * 256 });

fastify.get('/', (req, reply) => {
  let text = `Text hosting service\n\nCommond Line\n  curl -d text='any words' https://text.cinwell.com\n`;

  if (!isCURL(req)) {
    text =
      `<pre>${text}\nOnline<pre>` +
      '<form method=post accept-charset=utf8><textarea name=text></textarea><div><input type=submit></div></form>';
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
      ContentType: 'text/plain;charset=utf-8',
      CacheControl: 'max-age: 31536000',
      Body: Buffer.from(text)
    },
    (err, data) => {
      if (err) {
        reply.code = 400;
        reply.send(err);
      } else {
        const url = `https://text.cinwell.com/${hash}`;
        if (!isCURL(req)) {
          reply.header('content-type', 'text/html');
          reply.send(`Click <a href="${url}">${url}</a>`);
        } else {
          reply.send(`curl ${url}`);
        }
      }
    }
  );
});

fastify.listen(4930, '0.0.0.0', err => {
  if (err) throw err;
  console.log(`server listening on ${fastify.server.address().port}`);
});
