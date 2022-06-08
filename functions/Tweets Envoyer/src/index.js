const { Query, Client, Database } = require("node-appwrite");
const crypto = require('crypto');
const { TwitterApi } = require('twitter-api-v2');

const algorithm = 'aes-256-ctr';

/**
 * @description Decrypts the stored tokens into viable tokens using provided secret key
 * @param {Sting} hash 
 * @param {String} secretKey 
 * @returns {String}
 */
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
  // create array containing user threads with timeFloor <= postTime <= timeCeil to take into account of possible cron call latency
  let threadsToPost = await database.listDocuments(THREADS_COLLECTION_ID, [
    Query.lesserEqual('postTime', [timeCeil]),
    Query.greaterEqual('postTime', [timeFloor])
  ]);
  
  // fetch all users with posting permissions
  let twitterPermittedUsers = await database.listDocuments(TWITTER_INFO_COLLECTION_ID);
  let postRequests = [];
  let posted, errors;

  if(threadsToPost.total){
    for(const thread of threadsToPost.documents){
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
        
        postRequests.push(userClient.v1.tweetThread(thread.tweets));
        posted++;
      }
    }
  }

  // post threads
  try {
    posted = await Promise.all(postRequests);
  } catch(error) {
    errors = error
  }

  res.json({
    status: `between ${timeFloor} and ${timeCeil}`,
    threadsToPost,
    postRequests,
    posted,
    errors
  });
};
