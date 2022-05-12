const { TwitterApi } = require('twitter-api-v2');
const crypto = require('crypto');
const algorithm = 'aes-256-ctr';
const iv = crypto.randomBytes(16);

const encrypt = (text, secretKey) => {

    const cipher = crypto.createCipheriv(algorithm, secretKey, iv);

    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);

    return `${iv.toString('hex')}***${encrypted.toString('hex')}`;
};

module.exports = async function (req, res) {
  const ENCRYPTION_SECRET = req.env['ENCRYPTION_SECRET'];
  const twitterConsumerKey = req.env['TWITTER_API_KEY'];
  const twitterConsumerKeySecret = req.env['TWITTER_API_KEY_SECRET'];
  const twitterAuthRedirectRoute = req.env['TWITTER_AUTH_REDIRECT_ENDPOINT'];
  const DATA = JSON.parse(req.env["APPWRITE_FUNCTION_DATA"])
  const {
    request,
    user
  } = DATA;

  if (
    !req.env['TWITTER_API_KEY'] ||
    !req.env['TWITTER_API_KEY_SECRET'] ||
    !req.env['TWITTER_AUTH_REDIRECT_ENDPOINT']
  ) {
    console.warn("Environment variables are not set. Function cannot work.");
  } else {
    let client;
    if(request.type === "step-1"){
      // twitter oauth step 1

      client = new TwitterApi({ appKey: twitterConsumerKey, appSecret: twitterConsumerKeySecret });
      const authLink = await client.generateAuthLink(twitterAuthRedirectRoute, { linkMode: 'authorize' });
      res.json({
        status: 'success',
        step: 1,
        tokens: {
          tempOauthToken: authLink.oauth_token,
          tempOauthTokenSecret: authLink.oauth_token_secret,
          twitterUrl: authLink.url
        },
        user
      });
    } else {
      // twitter oauth step 3
      // Create a client from temporary tokens
      client = new TwitterApi({
        appKey: twitterConsumerKey,
        appSecret: twitterConsumerKeySecret,
        accessToken: request.oauthToken,
        accessSecret: request.oauthTokenSecret,
      });

      // Obtain the persistent tokens & encrypt them
      client.login(request.oauthVerifier)
        .then(({ client: loggedClient, accessToken, accessSecret, screenName, userId }) => {
          res.json({
            status: 'success',
            step: 3,
            twitterData: {
              encryptedToken: encrypt(accessToken, ENCRYPTION_SECRET),
              encryptedSecret: encrypt(accessSecret, ENCRYPTION_SECRET),
              twitterHandle: screenName,
              twitterUserId: userId,
            },
            user
          });
        })
        .catch(err => {
          res.json({
            step: 3,
            status: 'failure',
            err,
            request,
            user
          });
        });
    }
  }
};