const { Client, Database } = require("node-appwrite");
const crypto = require('crypto');
const { TwitterApi } = require('twitter-api-v2');

const algorithm = 'aes-256-ctr';

const decrypt = (hash, secretKey) => {
    const [usedIv, secret] = hash.split("***")
    const decipher = crypto.createDecipheriv(algorithm, secretKey, Buffer.from(usedIv, 'hex'));

    const decrpyted = Buffer.concat([decipher.update(Buffer.from(secret, 'hex')), decipher.final()]);

    return decrpyted.toString();
};

module.exports = async function (req, res) {
  const ENCRYPTION_SECRET = req.env['ENCRYPTION_SECRET'];
  const THREADS_COLLECTION_ID = req.env['THREADS_COLLECTION_ID'];
  const TWITTER_INFO_COLLECTION_ID = req.env['TWITTER_INFO_COLLECTION_ID'];
  const TWITTER_CONSUMER_KEY = req.env['TWITTER_CONSUMER_KEY'];
  const TWITTER_CONSUMER_SECRET = req.env['TWITTER_CONSUMER_SECRET'];

  const currentTimeISO = new Date();
  const timeFloor = Date.parse(new Date(currentTimeISO.setMinutes(currentTimeISO.getMinutes() - 1)));
  const timeCeil = Date.parse(new Date(currentTimeISO.setMinutes(currentTimeISO.getMinutes() + 1)));

  const client = new Client();

  // services
  let database = new Database(client);

  if (
    !req.env['APPWRITE_FUNCTION_ENDPOINT'] ||
    !req.env['APPWRITE_FUNCTION_API_KEY']
  ) {
    console.warn("Environment variables are not set. Function cannot use Appwrite SDK.");
  } else {
    client
      .setEndpoint(req.env['APPWRITE_FUNCTION_ENDPOINT'])
      .setProject(req.env['APPWRITE_FUNCTION_PROJECT_ID'])
      .setKey(req.env['APPWRITE_FUNCTION_API_KEY'])
      .setSelfSigned(true);
  }

  // posting tweets 
  let threadsToPost = await database.listDocuments(THREADS_COLLECTION_ID);

  // create array containing user threads containing threads with timeFloor <= postTime =< timeCeil to take into account of latency
  let filteredThreads = threadsToPost.total ? threadsToPost.documents.filter(doc => doc.postTime >= timeFloor && timeCeil > doc.postTime) : [];
  
  // fetch all users with posting permissions
  let twitterPermittedUsers = await database.listDocuments(TWITTER_INFO_COLLECTION_ID);
  let postedPosts = [];

  if(filteredThreads.length){
    let posted = 0, notPosted = 0, errors = 0;
    for(const thread of filteredThreads){
      let permissionData = twitterPermittedUsers.documents.find(u => u.userID === thread.userID);
      if(thread.tweets.length && permissionData !== undefined){
        let { token, secret } = permissionData;
        let userToken = decrypt(token, ENCRYPTION_SECRET);
        let userSecret = decrypt(secret, ENCRYPTION_SECRET);
        const userClient = new TwitterApi({
          appKey: TWITTER_CONSUMER_KEY,
          appSecret: TWITTER_CONSUMER_SECRET,
          accessToken: userToken,
          accessSecret: userSecret,
        });
        
        await userClient.v1.tweetThread(thread.tweets)
        postedPosts.push({
          tweets: thread.tweets,
          user: {
            key: userToken,
            secret: userSecret
          },
          client: {
            key: TWITTER_CONSUMER_KEY,
            secret: TWITTER_CONSUMER_SECRET
          },
        });
        posted++;
      } else {
        notPosted++;
      }
      res.json({
        status: `Posted ${posted} [${errors} errors] Threads for ${timeFloor} <= time >= ${timeCeil}`,
        posted,
        postedPosts,
        notPosted
      });
    }
  }
};
