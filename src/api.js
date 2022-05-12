import { Appwrite, Query } from "appwrite";
import { Vars } from "./config";

export const api = {
  sdk: null,

  provider: () => {
    if (api.sdk) return api.sdk;
    let appwrite = new Appwrite();
    appwrite.setEndpoint(Vars.endpoint).setProject(Vars.project);
    api.sdk = appwrite;
    return appwrite;
  },

  createAccount: (email) => {
    return api.provider().account.createMagicURLSession('unique()', email, Vars.authEndpoint);
  },

  getAccount: () => {
    return api.provider().account.get();
  },

  createAuthSession: (userId, secret) => {
    return api.provider().account.updateMagicURLSession(userId, secret);
  },

  deleteAuthSession: () => {
    return api.provider().account.deleteSession('current');
  },

  createDocument: (collectionId, data, read, write) => {
    return api
      .provider()
      .database.createDocument(collectionId, 'unique()', data, read, write);
  },

  listDocuments: (collectionId) => {
    return api.provider().database.listDocuments(collectionId);
  },

  updateDocument: (collectionId, documentId, data, read, write) => {
    return api
      .provider()
      .database.updateDocument(collectionId, documentId, data, read, write);
  },

  deleteDocument: (collectionId, documentId) => {
    return api.provider().database.deleteDocument(collectionId, documentId);
  },

  twitterOauth: (data) => {
    return api.provider().functions.createExecution(Vars.twitterOauthFunction, JSON.stringify(data));
  },

  getFunExecution: (fnId, executionId) => {
    return api.provider().functions.getExecution(fnId, executionId);
  },

  getTwitterInfo: (userId) => {
    return api.provider().database.listDocuments(Vars.twitterInfoCollection, [
      Query.equal('userID', [userId])
    ]);
  }
};