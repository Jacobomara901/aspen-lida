import { create } from 'apisauce';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import * as Updates from 'expo-updates';
import _ from 'lodash';

// custom components and helper files
import { popToast } from '../components/loadError';
import { createAuthTokens, getErrorMessage, getHeaders, postData, problemCodeMap } from './apiAuth';
import { GLOBALS, LOGIN_DATA } from './globals';
import { PATRON } from './loadPatron';
import { logDebugMessage, logErrorMessage } from './logging';

export async function checkCachedUrl(url) {
     const postBody = await postData();
     const api = create({
          baseURL: url + '/API',
          timeout: GLOBALS.timeoutFast,
          headers: getHeaders(true),
          auth: createAuthTokens(),
     });
     const response = await api.post('/SystemAPI?method=getCatalogStatus', postBody);
     return !!response.ok;
}

export async function getLibrarySystem(data) {
     const discovery = create({
          baseURL: data.patronsLibrary['baseUrl'] + '/API',
          timeout: GLOBALS.timeoutFast,
          headers: getHeaders(),
          auth: createAuthTokens(),
          params: {
               id: data.patronsLibrary['libraryId'],
          },
     });
     const response = await discovery.get('/SystemAPI?method=getLibraryInfo');
     if (response.ok) {
          if (response.data.result) {
               return response.data.result.library;
          }
     } else {
          const error = getErrorMessage({ statusCode: response.status, problem: response.problem, sendToSentry: true });
          popToast(error.title, error.message, 'error');
          logErrorMessage(response);
     }

     return [];
}

export async function getLibraryBranch(data) {
     const discovery = create({
          baseURL: data.patronsLibrary['baseUrl'] + '/API',
          timeout: GLOBALS.timeoutFast,
          headers: getHeaders(),
          auth: createAuthTokens(),
          params: {
               id: data.patronsLibrary['locationId'],
               library: data.patronsLibrary['solrScope'],
               version: GLOBALS.appVersion,
          },
     });
     const response = await discovery.get('/SystemAPI?method=getLocationInfo');
     if (response.ok) {
          if (response.data.result) {
               return response.data.result.location;
          }
     } else {
          const error = getErrorMessage({ statusCode: response.status, problem: response.problem, sendToSentry: true });
          popToast(error.title, error.message, 'error');
          logErrorMessage(response);
     }
     return [];
}

export async function getUserProfile(data, user, pass) {
     const postBody = new FormData();
     postBody.append('username', user['valueUser']);
     postBody.append('password', pass['valueSecret']);

     const discovery = create({
          baseURL: data.patronsLibrary['baseUrl'] + '/API',
          timeout: GLOBALS.timeoutAverage,
          headers: getHeaders(true),
          auth: createAuthTokens(),
          params: {
               linkedUsers: true,
               checkIfValid: false,
          },
     });
     const response = await discovery.post('/UserAPI?method=getPatronProfile', postBody);
     if (response.ok) {
          if (response.data.result) {
               return response.data.result.profile;
          }
     } else {
          const error = getErrorMessage({ statusCode: response.status, problem: response.problem, sendToSentry: true });
          popToast(error.title, error.message, 'error');
          logErrorMessage(response);
     }
     return [];
}

function normalizeBrowseCategoriesAndHomeLinks(result) {
     if (_.isArray(result)) {
          return { browseCategories: result, homeScreenLinks: [] };
     }
     if (_.isObject(result) && (!_.isUndefined(result.browseCategories) || !_.isUndefined(result.homeScreenLinks))) {
          return {
               browseCategories: result.browseCategories ?? [],
               homeScreenLinks: result.homeScreenLinks ?? [],
          };
     }
     return null;
}

export async function getBrowseCategoriesAndHomeLinks(data, user, pass) {
     const postBody = new FormData();
     postBody.append('username', user['valueUser']);
     postBody.append('password', pass['valueSecret']);

     const discovery = create({
          baseURL: data.patronsLibrary['baseUrl'] + '/API',
          timeout: GLOBALS.timeoutAverage,
          headers: getHeaders(true),
          auth: createAuthTokens(),
          params: {
               maxCategories: 5,
               LiDARequest: true,
          },
     });

     const endpoints = [
          '/SearchAPI?method=getHomeScreenFeed',
          '/SearchAPI?method=getBrowseCategories',
          '/SearchAPI?method=getAppActiveBrowseCategories&includeSubCategories=true',
     ];

     let lastResponse;
     for (const endpoint of endpoints) {
          lastResponse = await discovery.post(endpoint, postBody);
          if (lastResponse.ok) {
               const normalized = normalizeBrowseCategoriesAndHomeLinks(lastResponse.data?.result);
               if (normalized) {
                    return normalized;
               }
          }
     }

     if (!lastResponse?.ok) {
          const error = getErrorMessage({ statusCode: lastResponse?.status, problem: lastResponse?.problem, sendToSentry: true });
          popToast(error.title, error.message, 'error');
          logErrorMessage(lastResponse);
     }
     return { browseCategories: [], homeScreenLinks: [] };
}