import {create} from 'apisauce';
import i18n from 'i18n-js';
import {includes, isUndefined, orderBy, size, sortBy, values} from 'lodash';
import { popAlert, popToast } from '../../components/loadError';
import { createAuthTokens, ENDPOINT, getErrorMessage, getHeaders, postData } from '../apiAuth';
import {GLOBALS} from '../globals';
import {PATRON} from '../loadPatron';

import { logDebugMessage, logInfoMessage, logWarnMessage, logErrorMessage } from '../logging.js';

const endpoint = ENDPOINT.user;

/** *******************************************************************
 * General
 ******************************************************************* **/
/**
 * Returns profile information for a given user
 * @param {string} url
 **/
export async function refreshProfile(url) {
     const postBody = await postData();
     const discovery = create({
          baseURL: url,
          timeout: GLOBALS.timeoutSlow,
          headers: getHeaders(endpoint.isPost),
          auth: createAuthTokens(),
          params: {
               linkedUsers: true,
               checkIfValid: false,
          },
     });
     logDebugMessage("Refreshing profile");
     return await discovery.post(`${endpoint.url}getPatronProfile`, postBody);
}

/**
 * Returns profile information for a given user (force refresh)
 * @param {string} url
 **/
export async function reloadProfile(url) {
     const postBody = await postData();
     const discovery = create({
          baseURL: url,
          timeout: GLOBALS.timeoutSlow, //MDN 25.08 DIS-276 use the slow timeout to give connections to eContent time to reload
          headers: getHeaders(endpoint.isPost),
          auth: createAuthTokens(),
          params: {
               linkedUsers: true,
               reload: true,
               checkIfValid: false,
          },
     });
     logDebugMessage("Reloading profile");
     const response = await discovery.post(`${endpoint.url}getPatronProfile`, postBody);
     if (response.ok) {
          if (response.data.result) {
               if (response.data?.result?.profile) {
                    return response.data.result.profile;
               } else {
                    return response.data.result;
               }
          }else{
               logWarnMessage("Reloading profile failed, did not get a result");
          }
     }else{
          getErrorMessage({ statusCode: response.status, problem: response.problem, sendToSentry: true });
          logErrorMessage(response);
     }
     return {
          success: false,
          errorFetching: true
     };
}

/**
 * Validates the given credentials to initiate logging into Aspen LiDA. For Discovery 23.02.00 and later.
 * @param {string} username
 * @param {password} password
 * @param {string} url
 **/
export async function loginToLiDA(username, password, url) {
     const postBody = new FormData();
     postBody.append('username', username);
     postBody.append('password', password);
     const discovery = create({
          baseURL: url + '/API',
          timeout: GLOBALS.timeoutFast,
          headers: getHeaders(true),
          auth: createAuthTokens(),
     });
     return await discovery.post('/UserAPI?method=loginToLiDA', postBody);
     if (results.ok) {
          logInfoMessage("Got API response from loginToLiDA");
          logInfoMessage(results.data);
          return results.data.result;
     }else{
          getErrorMessage({ statusCode: results.status, problem: results.problem, sendToSentry: true });
          logErrorMessage(results);
     }
}

/**
 * Validates the given credentials to initiate logging into Aspen LiDA. For Discovery 23.01.00 and older.
 * @param {string} username
 * @param {string} password
 * @param {string} url
 **/
export async function validateUser(username, password, url) {
     const postBody = new FormData();
     postBody.append('username', username);
     postBody.append('password', password);
     const discovery = create({
          baseURL: url + '/API',
          timeout: GLOBALS.timeoutSlow,
          headers: getHeaders(true),
          auth: createAuthTokens(),
     });
     const results = await discovery.post('/UserAPI?method=validateAccount', postBody);
     logDebugMessage("Validating User");
     if (results.ok) {
          return results.data.result;
     }else{
          logWarnMessage("Validating User failed");
          getErrorMessage({ statusCode: results.status, problem: results.problem, sendToSentry: true });
          logErrorMessage(results);
     }
}

/**
 * Validates the given session to see if still valid in Discovery.
 * @param {string} url
 **/
export async function validateSession(url) {
     logDebugMessage("Validating Session");
     const postBody = await postData();
     const api = create({
          baseURL: url + '/API',
          timeout: GLOBALS.timeoutSlow,
          headers: getHeaders(true),
          auth: createAuthTokens(),
     });
     return await api.post('/UserAPI?method=validateSession', postBody);
}

/**
 * Revalidates the stored user details.
 * @param {string} url
 **/
export async function revalidateUser(url) {
     const postBody = await postData();
     const api = create({
          baseURL: url + '/API',
          timeout: GLOBALS.timeoutSlow,
          headers: getHeaders(true),
          auth: createAuthTokens(),
     });
     const response = await api.post('/UserAPI?method=validateUserCredentials', postBody);
     logDebugMessage("Revalidating User");
     if (response.ok) {
          if (response?.data?.result?.valid) {
               return response.data.result.valid;
          } else {
               logWarnMessage("Revalidating user return invalid");
          }
     } else {
          logWarnMessage("Revalidating user failed");
          getErrorMessage({ statusCode: response.status, problem: response.problem, sendToSentry: true });
          logErrorMessage(response);
     }
     return false;
}

/**
 * Logout the user and end the Aspen Discovery session
 **/
export async function logoutUser(url) {
     const api = create({
          baseURL: url,
          timeout: GLOBALS.timeoutFast,
          headers: getHeaders(endpoint.isPost),
          auth: createAuthTokens(),
     });
     const response = await api.get(`${endpoint.url}logout`);
     if (response.ok) {
          return response.data;
     } else {
          getErrorMessage({ statusCode: response.status, problem: response.problem, sendToSentry: true });
          logErrorMessage(response);
          return false;
     }
}

/**
 * Updates a given sort type for the user
 * @param {string} sortType
 * @param {string} sortValue
 * @param {string} language
 * @param {string} url
 **/
export async function setSortPreferences(sortType, sortValue, language = 'en', url) {
     const postBody = await postData();
     const discovery = create({
          baseURL: url + '/API',
          timeout: GLOBALS.timeoutAverage,
          headers: getHeaders(true),
          auth: createAuthTokens(),
          params: {
               [sortType]: sortValue,
               language: language,
          },
     });
     const response = await discovery.post('/UserAPI?method=updateSortPreferences', postBody);
     if (!response.ok) {
          getErrorMessage({ statusCode: response.status, problem: response.problem, sendToSentry: true });
          logErrorMessage(response);
     }
     return response;
}

/**
 * Updates the users alternate library card
 * @param {string} cardNumber
 * @param {string} cardPassword
 * @param {boolean} deleteCard
 * @param {string} url
 * @param {string} language
 **/
export async function updateAlternateLibraryCard(cardNumber = '', cardPassword = '', deleteCard = false, url, language = 'en') {
     const postBody = await postData();
     postBody.append('alternateLibraryCard', cardNumber);
     postBody.append('alternateLibraryCardPassword', cardPassword);

     const api = create({
          baseURL: url + '/API',
          headers: getHeaders(true),
          auth: createAuthTokens(),
          params: {
               deleteAlternateLibraryCard: deleteCard,
               language,
          },
     });

     const response = await api.post('/UserAPI?method=updateAlternateLibraryCard', postBody);
     let data = [];
     if (response.ok) {
          data = response.data;
     } else {
          getErrorMessage({ statusCode: response.status, problem: response.problem, sendToSentry: true });
          logErrorMessage(response);
     }

     return {
          success: data?.success ?? false,
          title: data?.title ?? null,
          message: data?.message ?? null,
     };
}

/**
 * Updates hold pickup preferences the user
 * @param {string} pickupLocationId
 * @param {string} myLocation1Id
 * @param {string} myLocation2Id
 * @param {string} sublocation
 * @param {int} rememberHoldPickupLocation
 * @param {string} language
 * @param {string} url
 **/
export async function updateHoldPickupPreferences(pickupLocationId = "", myLocation1Id = "", myLocation2Id = "", sublocation = "", rememberHoldPickupLocation = -1, language = 'en', url) {
     const params = {
          ...(pickupLocationId !== -1 && pickupLocationId !== 0 && pickupLocationId !== "" && { pickupLocationId }),
          ...(myLocation1Id !== -1 && myLocation1Id !== 0 && myLocation1Id !== ""  && { myLocation1Id }),
          ...(myLocation2Id !== -1 && myLocation2Id !== 0 && myLocation2Id !== "" && { myLocation2Id }),
          ...(sublocation !== -1 && sublocation !== 0 && sublocation !== "" && { sublocation }),
          rememberHoldPickupLocation: rememberHoldPickupLocation ?? "",
          language,
     };

     const postBody = await postData();
     const discovery = create({
          baseURL: url + '/API',
          timeout: GLOBALS.timeoutAverage,
          headers: getHeaders(true),
          auth: createAuthTokens(),
          params: params,
     });
     const response  = await discovery.post('/UserAPI?method=updateHoldPickupPreferences', postBody);
     if(response.ok) {
          if(response.data.error) {
               popAlert("Error", response.data.error, 'error');
          } else {
               popAlert(response.data.result.title, response.data.result.message, response.data.result.success === true ? 'success' : 'error');
          }
     } else {
          getErrorMessage({ statusCode: response.status, problem: response.problem, sendToSentry: true });
          logErrorMessage(response);
     }
}

/** *******************************************************************
 * Checkouts and Holds
 ******************************************************************* **/
/**
 * Return a list of current holds for a user
 * @param {string} readySort
 * @param {string} pendingSort
 * @param {string} holdSource
 * @param {string} url
 * @param {boolean} refresh
 * @param {string} language
 **/
export async function getPatronHolds(readySort = 'expire', pendingSort = 'sortTitle', holdSource = 'all', url, refresh = true, language = 'en') {
     const postBody = await postData();
     const discovery = create({
          baseURL: url + '/API',
          timeout: GLOBALS.timeoutAverage,
          headers: getHeaders(true),
          auth: createAuthTokens(),
          params: {
               source: holdSource,
               linkedUsers: true,
               refreshHolds: refresh,
               unavailableSort: pendingSort,
               availableSort: readySort,
               language,
          },
     });
     return await discovery.post('/UserAPI?method=getPatronHolds', postBody);
}

export function formatHolds(data) {
     let holdsReady = [];
     let holdsNotReady = [];

     if (typeof data.unavailable !== 'undefined') {
          holdsNotReady = Object.values(data.unavailable);
     }

     if (typeof data.available !== 'undefined') {
          holdsReady = Object.values(data.available);
     }

     return [
          {
               title: 'Ready',
               data: holdsReady,
          },
          {
               title: 'Pending',
               data: holdsNotReady,
          },
     ];
}

export function sortHolds(holds, pendingSort, readySort) {
     let sortedHolds = holds;
     let holdsReady = [];
     let holdsNotReady = [];

     let pendingSortMethod = pendingSort;
     if (pendingSort === 'sortTitle') {
          pendingSortMethod = 'title';
     } else if (pendingSort === 'libraryAccount') {
          pendingSortMethod = 'user';
     }

     let readySortMethod = readySort;
     if (readySort === 'sortTitle') {
          readySortMethod = 'title';
     } else if (readySort === 'libraryAccount') {
          readySortMethod = 'user';
     }

     if (holds) {
          if (holds[1].title === 'Pending') {
               holdsNotReady = holds[1].data;
               if (pendingSortMethod === 'position') {
                    holdsNotReady = orderBy(
                         holdsNotReady,
                         function (obj) {
                              return Number(obj.position);
                         },
                         ['desc']
                    );
               }
               holdsNotReady = orderBy(holdsNotReady, [pendingSortMethod], ['asc']);
          }

          if (holds[0].title === 'Ready') {
               holdsReady = holds[0].data;
               holdsReady = orderBy(holdsReady, [readySortMethod], ['asc']);
          }
     }

     return [
          {
               title: 'Ready',
               data: holdsReady,
          },
          {
               title: 'Pending',
               data: holdsNotReady,
          },
     ];
}

/**
 * Return a list of current checkouts for a user
 * @param {string} source
 * @param {string} url
 * @param {boolean} refresh
 * @param {string} language
 **/
export async function getPatronCheckedOutItems(source = 'all', url, refresh = true, language = 'en') {
     console.log("Loading checked out items for source " + source);
     const postBody = await postData();
     const discovery = create({
          baseURL: url + '/API',
          timeout: GLOBALS.timeoutAverage,
          headers: getHeaders(true),
          auth: createAuthTokens(),
          params: {
               source: source,
               linkedUsers: true,
               refreshCheckouts: refresh,
               language,
          },
     });
     return await discovery.post('/UserAPI?method=getPatronCheckedOutItems', postBody);
}

export function sortCheckouts(checkouts, sort) {
     let sortedCheckouts = [];
     logDebugMessage("Sorting checkouts by " + sort);

     let sortMethod = sort;
     let order = 'asc';
     if (sort === 'sortTitle') {
          sortMethod = 'title';
     } else if (sort === 'libraryAccount') {
          sortMethod = 'user';
     } else if (sort === 'dueDesc') {
          sortMethod = 'dueDate';
          order = 'desc';
     } else if (sort === 'dueAsc') {
          sortMethod = 'dueDate';
     } else if (sort === 'timesRenewed') {
          sortMethod = 'renewCount';
          order = 'desc';
     }

     if (checkouts) {
          sortedCheckouts = orderBy(checkouts, [sortMethod], [order]);
     }

     return sortedCheckouts;
}

/**
 * Deletes the Aspen user and related data. Does not delete the user from the ILS.
 * @param {string} url
 **/
export async function deleteAspenUser(url) {
     const postBody = await postData();
     const discovery = create({
          baseURL: url + '/API',
          timeout: GLOBALS.timeoutFast,
          headers: getHeaders(true),
          auth: createAuthTokens(),
     });
     const results = await discovery.post('/UserAPI?method=deleteAspenUser', postBody);
     if (results.ok) {
          if(results?.data?.result) {
               return results.data.result;
          } else {
               logErrorMessage(results);
               return {
                    success: false,
                    message: 'Unknown error trying to complete request.'
               }
          }
     } else {
          getErrorMessage({ statusCode: results.status, problem: results.problem, sendToSentry: true });
          logErrorMessage(results);
     }
}

/** *******************************************************************
 * Browse Category Management
 ******************************************************************* **/

/** *******************************************************************
 * Linked Accounts
 ******************************************************************* **/
/**
 * Return a list of accounts that the user has initiated account linking with
 * @param {string} url
 * @param {string} language
 * @return array
 **/
export async function getLinkedAccounts(url, language = 'en') {
     const postBody = await postData();
     const discovery = create({
          baseURL: url + '/API',
          timeout: GLOBALS.timeoutAverage,
          headers: getHeaders(true),
          auth: createAuthTokens(),
          params: {
               language,
          },
     });
     return await discovery.post('/UserAPI?method=getLinkedAccounts', postBody);
}

export function formatLinkedAccounts(primaryUser, cards, barcodeStyle, data) {
     let count = 1;
     let cardStack = [];
     let accounts = [];
     const primaryCard = {
          key: 0,
          displayName: primaryUser.displayName,
          userId: primaryUser.id,
          ils_barcode: primaryUser.ils_barcode ?? primaryUser.cat_username,
          expired: primaryUser.expired,
          expires: primaryUser.expires,
          barcodeStyle: barcodeStyle,
          homeLocation: primaryUser.homeLocation,
     };
     cardStack.push(primaryCard);
     if (!isUndefined(data)) {
          accounts = values(data);
          PATRON.linkedAccounts = accounts;
          if (size(accounts) >= 1) {
               accounts.forEach((account) => {
                    if (includes(cards, account.ils_barcode) === false) {
                         count = count + 1;
                         const card = {
                              key: count,
                              displayName: account.displayName,
                              userId: account.id,
                              ils_barcode: account.ils_barcode ?? account.barcode,
                              expired: account.expired,
                              expires: account.expires,
                              barcodeStyle: account.barcodeStyle ?? barcodeStyle,
                              homeLocation: account.homeLocation,
                         };
                         cardStack.push(card);
                    } else if (includes(cards, account.cat_username) === false) {
                         count = count + 1;
                         const card = {
                              key: count,
                              displayName: account.displayName,
                              userId: account.id,
                              cat_username: account.cat_username ?? account.barcode,
                              expired: account.expired,
                              expires: account.expires,
                              barcodeStyle: account.barcodeStyle ?? barcodeStyle,
                              homeLocation: account.homeLocation,
                         };
                         cardStack.push(card);
                    }
               });
          }
     }
     return {
          accounts: accounts ?? [],
          cards: cardStack ?? [],
     };
}

/**
 * Return a list of accounts that the user has been linked to by another user
 * @param {string} url
 * @param {string} language
 **/
export async function getViewerAccounts(url, language = 'en') {
     const postBody = await postData();
     const discovery = create({
          baseURL: url + '/API',
          timeout: GLOBALS.timeoutAverage,
          headers: getHeaders(true),
          auth: createAuthTokens(),
          params: {
               language,
          },
     });
     return await discovery.post('/UserAPI?method=getViewers', postBody);
}

/**
 * Add an account that the user wants to create a link to
 * @param {string} username
 * @param {string} password
 * @param {string} url
 * @param {string} language
 **/
export async function addLinkedAccount(username = '', password = '', url, language = 'en') {
     const postBody = await postData();
     postBody.append('accountToLinkUsername', username);
     postBody.append('accountToLinkPassword', password);
     const discovery = create({
          baseURL: url + '/API',
          timeout: GLOBALS.timeoutFast,
          headers: getHeaders(true),
          auth: createAuthTokens(),
          params: {
               language,
          },
     });
     const response = await discovery.post('/UserAPI?method=addAccountLink', postBody);
     if (response.ok) {
          let status = false;
          if (!isUndefined(response.data.result.success)) {
               status = response.data.result.success;
               if (status !== true) {
                    popAlert(response.data.result.title, response.data.result.message, 'error');
               } else {
                    try {
                         popAlert(response.data.result.title, response.data.result.message, 'success');
                    } catch (e) {
                         logErrorMessage(e);
                    }
               }
          } else {
               logDebugMessage("disableAccountLinking did not return a success status");
               logErrorMessage(response);
          }
          return status;
     } else {
          const error = getErrorMessage({ statusCode: response.status, problem: response.problem, sendToSentry: true });
          popToast(error.title, error.message, 'error');
          logErrorMessage(response);
          return false;
     }
}

/**
 * Remove an account that the user has created a link to
 * @param {string} patronToRemove
 * @param {string} url
 * @param {string} language
 **/
export async function removeLinkedAccount(patronToRemove, url, language) {
     const postBody = await postData();
     const discovery = create({
          baseURL: url + '/API',
          timeout: GLOBALS.timeoutFast,
          headers: getHeaders(true),
          auth: createAuthTokens(),
          params: {
               idToRemove: patronToRemove,
               language,
          },
     });
     const response = await discovery.post('/UserAPI?method=removeAccountLink', postBody);
     if (response.ok) {
          let status = false;
          if (!isUndefined(response.data.result.success)) {
               status = response.data.result.success;
               if (status !== true) {
                    popAlert(response.data.result.title, response.data.result.message, 'error');
               } else {
                    try {
                         popAlert(response.data.result.title, response.data.result.message, 'success');
                    } catch (e) {
                         logDebugMessage(e);
                    }
               }
          } else {
               logDebugMessage("disableAccountLinking did not return a success status");
               logErrorMessage(response);
          }
          return status;
     } else {
          const error = getErrorMessage({ statusCode: response.status, problem: response.problem, sendToSentry: true });
          popToast(error.title, error.message, 'error');
          logErrorMessage(response);
          return false;
     }
}

/**
 * Remove an account that another user has created a link to
 * @param {string} patronToRemove
 * @param {string} url
 * @param {string} language
 **/
export async function removeViewerAccount(patronToRemove, url, language = 'en') {
     const postBody = await postData();
     const discovery = create({
          baseURL: url + '/API',
          timeout: GLOBALS.timeoutFast,
          headers: getHeaders(true),
          auth: createAuthTokens(),
          params: {
               idToRemove: patronToRemove,
               language,
          },
     });
     const response = await discovery.post('/UserAPI?method=removeViewerLink', postBody);
     if (response.ok) {
          let status = false;
          if (!isUndefined(response.data.result.success)) {
               status = response.data.result.success;
               if (status !== true) {
                    popAlert(response.data.result.title, response.data.result.message, 'error');
               } else {
                    popAlert(response.data.result.title, response.data.result.message, 'success');
               }
          } else {
               logDebugMessage("disableAccountLinking did not return a success status");
               logErrorMessage(response);
          }
          return status;
     } else {
          const error = getErrorMessage({ statusCode: response.status, problem: response.problem, sendToSentry: true });
          popToast(error.title, error.message, 'error');
          logErrorMessage(response);
          return false;
     }
}

/**
 * Disables a users ability to use linked accounts
 * @param {string} language
 * @param {string} url
 **/
export async function disableAccountLinking(language, url) {
     const postBody = await postData();
     const discovery = create({
          baseURL: url + '/API',
          timeout: GLOBALS.timeoutFast,
          headers: getHeaders(true),
          auth: createAuthTokens(),
          params: {
               language,
          },
     });
     const response = await discovery.post('/UserAPI?method=disableAccountLinking', postBody);
     if (response.ok) {
          let status = false;
          if (!isUndefined(response.data.result.success)) {
               status = response.data.result.success;
               if (status !== true) {
                    popAlert(response.data.result.title, response.data.result.message, 'error');
               } else {
                    popAlert(response.data.result.title, response.data.result.message, 'success');
               }
          } else {
               logDebugMessage("disableAccountLinking did not return a success status");
               logErrorMessage(response);
          }
          return status;
     } else {
          getErrorMessage({ statusCode: response.status, problem: response.problem, sendToSentry: true });
          logErrorMessage(response);
          return false;
     }
}

/**
 * Re-enables a users ability to use linked accounts
 * @param {string} language
 * @param {string} url
 **/
export async function enableAccountLinking(language, url) {
     const postBody = await postData();
     const discovery = create({
          baseURL: url + '/API',
          timeout: GLOBALS.timeoutFast,
          headers: getHeaders(true),
          auth: createAuthTokens(),
          params: {
               language,
          },
     });
     const response = await discovery.post('/UserAPI?method=enableAccountLinking', postBody);
     if (response.ok) {
          let status = false;
          if (!isUndefined(response.data.result.success)) {
               status = response.data.result.success;
               if (status !== true) {
                    popAlert(response.data.result.title, response.data.result.message, 'error');
               } else {
                    popAlert(response.data.result.title, response.data.result.message, 'success');
               }
          }
          return status;
     } else {
          const error = getErrorMessage({ statusCode: response.status, problem: response.problem, sendToSentry: true });
          popToast(error.title, error.message, 'error');
          logErrorMessage(response);
          return false;
     }
}

/** *******************************************************************
 * Translations / Languages
 ******************************************************************* **/
/**
 * Update the user's language preference
 * @param {string} code
 * @param {string} url
 * @param {string} language
 **/
export async function saveLanguage(code, url, language = 'en') {
     const postBody = await postData();
     const discovery = create({
          baseURL: url + '/API',
          timeout: GLOBALS.timeoutFast,
          headers: getHeaders(true),
          auth: createAuthTokens(),
          params: {
               languageCode: code,
               language,
          },
     });
     const response = await discovery.post('/UserAPI?method=saveLanguage', postBody);
     if (response.ok) {
          PATRON.language = code;
          return true;
     } else {
          const error = getErrorMessage({ statusCode: response.status, problem: response.problem, sendToSentry: true });
          popToast(error.title, error.message, 'error');
          logErrorMessage(response);
          return false;
     }
}

/** *******************************************************************
 * Reading History
 ******************************************************************* **/
/**
 * Return the user's reading history
 * @param {number} page
 * @param {number} pageSize
 * @param {string} sort
 * @param {string} filter
 * @param {string} url
 * @param {string} language
 **/
export async function fetchReadingHistory(page = 1, pageSize = 20, sort = 'checkedOut', filter = '', url, language = 'en') {
     logDebugMessage("Fetching reading history page: " + page + " size: " + pageSize + " sort: " + sort + " filter: " + filter);
     const postBody = await postData();
     const api = create({
          baseURL: url + '/API',
          headers: getHeaders(true),
          auth: createAuthTokens(),
          params: {
               page: page,
               pageSize: pageSize,
               sort_by: sort,
               language,
               filter
          },
     });

     return await api.post('/UserAPI?method=getPatronReadingHistory', postBody);
}

export function formatReadingHistory(data) {
     let morePages = false;
     if (data.page_current !== data.page_total) {
          morePages = true;
     }
     return {
          history: data.readingHistory ?? [],
          totalResults: data.totalResults ?? 0,
          curPage: data.page_current ?? 0,
          totalPages: data.page_total ?? 0,
          hasMore: morePages,
          sort: data.sort ?? 'checkedOut',
          message: data.message ?? null,
     };
}

/**
 * Enable reading history for the user
 * @param {string} url
 * @param {string} language
 **/
export async function optIntoReadingHistory(url, language = 'en') {
     const postBody = await postData();
     const discovery = create({
          baseURL: url + '/API',
          timeout: GLOBALS.timeoutFast,
          headers: getHeaders(endpoint.isPost),
          auth: createAuthTokens(),
          params: {
               language,
          },
     });
     const response = await discovery.post('/UserAPI?method=optIntoReadingHistory', postBody);
     if (response.ok) {
          return true;
     } else {
          const error = getErrorMessage({ statusCode: response.status, problem: response.problem, sendToSentry: true });
          popToast(error.title, error.message, 'error');
          logErrorMessage(response);
          return false;
     }
}

/**
 * Disable reading history for the user
 * @param {string} url
 * @param {string} language
 **/
export async function optOutOfReadingHistory(url, language = 'en') {
     const postBody = await postData();
     const discovery = create({
          baseURL: url + '/API',
          timeout: GLOBALS.timeoutFast,
          headers: getHeaders(true),
          auth: createAuthTokens(),
          params: {
               language,
          },
     });
     const response = await discovery.post('/UserAPI?method=optOutOfReadingHistory', postBody);
     if (response.ok) {
          console.log(response.data);
          return true;
     } else {
          const error = getErrorMessage({ statusCode: response.status, problem: response.problem, sendToSentry: true });
          popToast(error.title, error.message, 'error');
          logErrorMessage(response);
          return false;
     }
}

/**
 * Delete all reading history for the user
 * @param {string} url
 * @param {string} language
 **/
export async function deleteAllReadingHistory(url, language = 'en') {
     const postBody = await postData();
     const discovery = create({
          baseURL: url + '/API',
          timeout: GLOBALS.timeoutFast,
          headers: getHeaders(true),
          auth: createAuthTokens(),
          params: {
               language,
          },
     });
     const response = await discovery.post('/UserAPI?method=deleteAllFromReadingHistory', postBody);
     if (response.ok) {
          console.log(response.data);
          if (response.data.result?.success) {
               return true;
          }
     } else {
          const error = getErrorMessage({ statusCode: response.status, problem: response.problem, sendToSentry: true });
          popToast(error.title, error.message, 'error');
          logErrorMessage(response);
          return false;
     }
}

/**
 * Delete selected reading history for the user
 * @param {string} item
 * @param {string} url
 * @param {string} language
 **/
export async function deleteSelectedReadingHistory(item, url, language = 'en') {
     const postBody = await postData();
     const discovery = create({
          baseURL: url + '/API',
          timeout: GLOBALS.timeoutFast,
          headers: getHeaders(true),
          auth: createAuthTokens(),
          params: {
               selected: item,
               language,
          },
     });
     const response = await discovery.post('/UserAPI?method=deleteSelectedFromReadingHistory', postBody);
     if (response.ok) {
          if (response.data.result?.success) {
               return true;
          }
     } else {
          const error = getErrorMessage({ statusCode: response.status, problem: response.problem, sendToSentry: true });
          popToast(error.title, error.message, 'error');
          logErrorMessage(response);
          return false;
     }
}

/** *******************************************************************
 * Saved Searches
 ******************************************************************* **/
/**
 * Return a list of the user's saved searches
 * @param {string} url
 * @param {string} language
 **/
export async function fetchSavedSearches(url, language = 'en') {
     const postBody = await postData();
     const api = create({
          baseURL: url + '/API',
          headers: getHeaders(true),
          auth: createAuthTokens(),
          params: {
               checkIfValid: false,
               language,
          },
     });

     return await api.post('/ListAPI?method=getSavedSearchesForLiDA', postBody);
}

/**
 * Return a list of titles from a given saved search
 * @param {string} id
 * @param {string} language
 * @param {string} url
 **/
export async function getSavedSearch(id, language = 'en', url) {
     const postBody = await postData();
     const api = create({
          baseURL: url + '/API',
          timeout: GLOBALS.timeoutAverage,
          headers: getHeaders(true),
          auth: createAuthTokens(),
          params: {
               searchId: id,
               numTitles: 30,
               language: language,
          },
     });
     const response = await api.post('/ListAPI?method=getSavedSearchTitles', postBody);
     if (response.ok) {
          return response.data?.result ?? [];
     } else {
          const error = getErrorMessage({ statusCode: response.status, problem: response.problem, sendToSentry: true });
          popToast(error.title, error.message, 'error');
          logErrorMessage(response);
          return [];
     }
}

/** *******************************************************************
 * Notifications
 ******************************************************************* **/
/**
 * Update the status on if the user should be prompted for notification onboarding
 * @param {boolean} status
 * @param {string} token
 * @param {string} url
 * @param {string} language
 **/
export async function updateNotificationOnboardingStatus(status, token, url, language = 'en') {
     const postBody = await postData();
     const discovery = create({
          baseURL: url + '/API',
          timeout: GLOBALS.timeoutFast,
          headers: getHeaders(true),
          auth: createAuthTokens(),
          params: {
               status,
               token,
               language,
          },
     });
     const response = await discovery.post('/UserAPI?method=updateNotificationOnboardingStatus', postBody);
     if (response.ok) {
          let wasUpdated = false;
          if (!isUndefined(response.data.result.success)) {
               wasUpdated = response.data.result.success;
               if (wasUpdated === true || wasUpdated === 'true') {
                    return true;
               }
          }
          return false;
     } else {
          getErrorMessage({ statusCode: response.status, problem: response.problem, sendToSentry: true });
          logErrorMessage(response);
          return false;
     }
}

export async function getAppPreferencesForUser(url, language) {
     const postBody = await postData();
     const discovery = create({
          baseURL: url + '/API',
          timeout: GLOBALS.timeoutFast,
          headers: getHeaders(true),
          auth: createAuthTokens(),
          params: {
               language,
          },
     });
     return await discovery.post('/UserAPI?method=getAppPreferencesForUser', postBody);
}

/**
 * Return the user's notification history
 * @param {number} page
 * @param {number} pageSize
 * @param {boolean} forceUpdate
 * @param {string} url
 * @param {string} language
 **/
export async function fetchNotificationHistory(page = 1, pageSize = 20, forceUpdate = false, url, language = 'en') {
     const postBody = await postData();
     const api = create({
          baseURL: url + '/API',
          headers: getHeaders(true),
          auth: createAuthTokens(),
          params: {
               page: page,
               pageSize: pageSize,
               forceUpdate,
               language,
          },
     });
     return await api.post('/UserAPI?method=getInbox', postBody);
}

export function formatNotificationHistory(data) {
     let morePages = false;

     if (data.page_current !== data.page_total) {
          morePages = true;
     }

     return {
          inbox: data.inbox ?? [],
          totalResults: data.totalResults ?? 0,
          curPage: data.page_current ?? 0,
          totalPages: data.page_total ?? 0,
          hasMore: morePages,
          message: data.message ?? null,
     };
}

/**
 * Update the status of a message to being read
 * @param {string} id
 * @param {string} url
 * @param {string} language
 **/
export async function markMessageAsRead(id, url, language = 'en') {
     const postBody = await postData();
     const api = create({
          baseURL: url + '/API',
          headers: getHeaders(true),
          auth: createAuthTokens(),
          params: {
               id,
               language,
          },
     });

     const response = await api.post('/UserAPI?method=markMessageAsRead', postBody);
     let data = [];
     let message = null;
     let title = null;
     if (response.ok) {
          data = response.data;
          if(data.message) {
               message = data.message;
          }
          if(data.title) {
               title = data.title;
          }
     } else {
          const error = getErrorMessage({ statusCode: response.status, problem: response.problem, sendToSentry: true });
          popToast(error.title, error.message, 'error');
          message = error.message;
          title = error.title;
          logErrorMessage(response);
     }

     return {
          success: data?.success ?? false,
          title: title,
          message: message,
     };
}

/**
 * Update the status of a message to being unread
 * @param {string} id
 * @param {string} url
 * @param {string} language
 **/
export async function markMessageAsUnread(id, url, language = 'en') {
     const postBody = await postData();
     const api = create({
          baseURL: url + '/API',
          headers: getHeaders(true),
          auth: createAuthTokens(),
          params: {
               id,
               language,
          },
     });

     const response = await api.post('/UserAPI?method=markMessageAsUnread', postBody);
     let data = [];
     let message = null;
     let title = null;
     if (response.ok) {
          data = response.data;
          if(data.message) {
               message = data.message;
          }
          if(data.title) {
               title = data.title;
          }
     } else {
          const error = getErrorMessage({ statusCode: response.status, problem: response.problem, sendToSentry: true });
          popToast(error.title, error.message, 'error');
          logErrorMessage(response);
          message = error.message;
          title = error.title;
     }

     return {
          success: data?.success ?? false,
          title: title,
          message: message,
     };
}

/** *******************************************************************
 * Screen Brightness
 ******************************************************************* **/
/**
 * Update the status on if the user should be prompted for providing screen brightness permissions
 * @param {boolean} status
 * @param {string} url
 * @param {string} language
 **/
export async function updateScreenBrightnessStatus(status, url, language = 'en') {
     const postBody = await postData();
     const discovery = create({
          baseURL: url + '/API',
          timeout: GLOBALS.timeoutFast,
          headers: getHeaders(true),
          auth: createAuthTokens(),
          params: {
               status,
               language,
          },
     });
     const response = await discovery.post('/UserAPI?method=updateScreenBrightnessStatus', postBody);
     if (response.ok) {
          let wasUpdated = false;
          if (!isUndefined(response.data.result.success)) {
               wasUpdated = response.data.result.success;
               if (wasUpdated === true || wasUpdated === 'true') {
                    return true;
               }
          }
          return false;
     } else {
          getErrorMessage({ statusCode: response.status, problem: response.problem, sendToSentry: true });
          logErrorMessage(response);
          return false;
     }
}

/** *******************************************************************
 *
 ******************************************************************* **/
/**
 *
 *
/**
 * Return a list of  for a user
 * @param {string} url
 * @param {string} language
 * @param {string} filter
 * @param {number} page
 * @param {number} pageSize
 *
 **/
export async function fetchCampaigns(page = 1, pageSize = 20, filter = 'enrolled', url, language = 'en') {
     const postBody = await postData();

     const api = create({
          baseURL: url + '/API',
          header: getHeaders(true),
          auth: createAuthTokens(),
          params: {
              page: page,
              pageSize: pageSize,
              filter: filter,
              language,
          },
     });

     const response = await api.post('/UserAPI?method=getUserCampaigns', postBody);
     let data = [];
     let morePages = false;
     let message = null;

     if (response.ok) {
          data = response.data;
          if (data.result?.page_current !== data.result?.page_total) {
               morePages = true;
          }
          if(data.data?.message) {
               message = data.data.message;
          }
     } else {
          const error = getErrorMessage({ statusCode: response.status, problem: response.problem, sendToSentry: true });
          logErrorMessage(response);
          message = error.message;
     }

     return {
         campaigns: data.result?.campaigns ?? [],
         totalResults: data.result?.totalResults ?? 0,
         totalPages: data.result?.page_total ??0,
         hasMore: morePages,
         filter: data.result?.filter ?? 'enrolled',
         message: message,
     }

};

/**
 * Enroll in campaign
 * @param {string} campaignId
 * @param {string} linkedUserId
 * @param {string} url
 * @param {string} language
 * @returns
 */
export async function enrollCampaign(campaignId, linkedUserId, filter = 'enrolled', url, language = 'en'){
     const postBody = await postData();
     const api = create({
          baseURL: url + '/API',
          header: getHeaders(true),
          auth: createAuthTokens(),
          params: {
               campaignId: campaignId,
               filter: filter,
               linkedUserId: linkedUserId,
               language
          },
     });

     const response = await api.post('/UserAPI?method=enrollUserInCampaign', postBody);
     let data = [];

     if (response.ok) {
          data = response.data;
          if (data.result && data.result.success) {
               return true;
          } else {
               logDebugMessage('Failed to enroll in campaign: ', data.message);
               return false;
          }
     } else {
          const error = getErrorMessage({ statusCode: response.status, problem: response.problem, sendToSentry: true });
          popToast(error.title, error.message, 'error');
          logErrorMessage(response);
          return false;
     }
}

/**
 *Unenroll from campaign
 * @param {string} campaignId
 * @param {string} linkedUserId
 * @param {string} url
 * @param {string} language *
 * @returns
 */
export async function unenrollCampaign(campaignId, linkedUserId, filter = 'enrolled', url, language = 'en'){
     const postBody = await postData();
     const api = create({
          baseURL: url + '/API',
          header: getHeaders(true),
          auth: createAuthTokens(),
          params: {
               campaignId: campaignId,
               filter: filter,
               linkedUserId: linkedUserId,
               language
          },
     });

     const response = await api.post('/UserAPI?method=unenrollUserFromCampaign', postBody);
     let data = [];

     if (response.ok) {
          data = response.data;
          if (data.result && data.result.success) {
               return true;
          } else {
               logDebugMessage('Failed to unenroll from campaign: ', data.message);
               return false;
          }
     } else {
          const error = getErrorMessage({ statusCode: response.status, problem: response.problem, sendToSentry: true });
          popToast(error.title, error.message, 'error');
          logErrorMessage(response);
          return false;
     }
}

/**
 * Opt into campaign emails
 * @param {string} campaignId
 * @param {string} linkedUserId
 * @param {string} url
 * @param {string} language
 * @param {boolean} optIn
 * @returns
 */
export async function optIntoCampaignEmails(campaignId, linkedUserId, filter = 'enrolled', optIn, url, language = 'en'){
     const postBody = await postData();
     const api = create({
          baseURL: url + '/API',
          header: getHeaders(true),
          auth: createAuthTokens(),
          params: {
               campaignId: campaignId,
               linkedUserId: linkedUserId,
               filter: filter,
               optIn,
               language
          },
     });

     const response = await api.post('/UserAPI?method=optUserIntoCampaignEmails', postBody, {params: {
          campaignId, linkedUserId, filter, optIn, language,
     }});
     let data = [];

     if (response.ok) {
          data = response.data;
          if (data.result && data.result.success) {
               return true;
          } else {
               logDebugMessage('Failed to opt user into campaign emails: ', data.message);
               return false;
          }
     } else {
          const error = getErrorMessage({ statusCode: response.status, problem: response.problem, sendToSentry: true });
          popToast(error.title, error.message, 'error');
          logErrorMessage(response);
          return false;
     }
}

/**
 * Opt out of Campaign Leaderboard
 * @param {string} campaignId
 * @param {string} linkedUserId
 * @param {string} url
 * @param {string} language
 * @returns
 */
export async function optUserInToCampaignLeaderboard(campaignId, linkedUserId, filter = 'enrolled', url, language = 'en'){
     const postBody = await postData();
     const api = create({
          baseURL: url + '/API',
          header: getHeaders(true),
          auth: createAuthTokens(),
          params: {
               campaignId: campaignId,
               filter: filter,
               linkedUserId: linkedUserId,
               language
          },
     });

     const response = await api.post('/UserAPI?method=enrollUserInCampaignLeaderboard', postBody);
     let data = [];

     if (response.ok) {
          data = response.data;
          if (data.result && data.result.success) {
               return true;
          } else {
               logDebugMessage('Failed to enroll in campaign leaderboard: ', data.message);
               return false;
          }
     } else {
          const error = getErrorMessage({ statusCode: response.status, problem: response.problem, sendToSentry: true });
          popToast(error.title, error.message, 'error');
          logErrorMessage(response);
          return false;
     }
}

/**
 * Opt into Campaign Leaderboard
 * @param {string} campaignId
 * @param {string} linkedUserId
 * @param {string} url
 * @param {string} language
 * @returns
 */
export async function optUserOutOfCampaignLeaderboard(campaignId, linkedUserId, filter = 'enrolled', url, language = 'en'){
     const postBody = await postData();
     const api = create({
          baseURL: url + '/API',
          header: getHeaders(true),
          auth: createAuthTokens(),
          params: {
               campaignId: campaignId,
               filter: filter,
               linkedUserId: linkedUserId,
               language
          },
     });

     const response = await api.post('/UserAPI?method=unenrollUserFromCampaignLeaderboard', postBody);
     let data = [];

     if (response.ok) {
          data = response.data;
          if (data.result && data.result.success) {
               return true;
          } else {
               logDebugMessage('Failed to enroll in campaign leaderboard: ', data.message);
               return false;
          }
     } else {
          const error = getErrorMessage({ statusCode: response.status, problem: response.problem, sendToSentry: true });
          popToast(error.title, error.message, 'error');
          logErrorMessage(response);
          return false;
     }
}

/**
 * Add Progress to Activity (Milestone or Extra Credit)
 * @param {string} activityId
 * @param {string} linkedUserId
 * @param {string} activityType - 'milestone' or 'extraCredit'
 * @param {string} filter
 * @param {string} url
 * @param {string} language
 * @returns
 */
export async function addActivityProgress(activityId, linkedUserId, activityType, filter = 'enrolled', url, language = 'en', campaignId){
     const postBody = await postData();
     const api = create({
          baseURL: url + '/API',
          header: getHeaders(true),
          auth: createAuthTokens(),
          params: {
               activityId: activityId,
               activityType: activityType,
               filter: filter,
               linkedUserId: linkedUserId,
               language,
               campaignId
          },
     });

     const response = await api.post('/UserAPI?method=addActivityProgress', postBody);
     let data = [];

     if (response.ok) {
          data = response.data;
          if (data.result && data.result.success) {
               return true;
          } else {
               logDebugMessage('Failed to add progress: ', data.message);
               return false;
          }
     } else {
          const error = getErrorMessage({ statusCode: response.status, problem: response.problem, sendToSentry: true });
          popToast(error.title, error.message, 'error');
          logErrorMessage(response);
          return false;
     }
}

