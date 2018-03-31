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

fastify.get('/', (request, reply) => {
  reply.send(
    `Text hosting service\n\nUsage:\n  curl -d text='any words' https://text.cinwell.com\n`
  );
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
