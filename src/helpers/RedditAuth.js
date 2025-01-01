import _ from 'lodash';

export const client_id = import.meta.env.VITE_REDDIT_CLIENT_ID;
console.log('client_id: ', client_id);
export const secret = `${import.meta.env.VITE_REDDIT_SECRET}`;
export const redirect_uri = `${import.meta.env.VITE_REDDIT_REDIRECT_URI}`;

export const reddit_host = 'https://www.reddit.com';
export const reddit_use_host = 'https://oauth.reddit.com';
export const accessTokenUrl = reddit_host + '/api/v1/access_token';

import queryString from 'query-string';

export class RedditAuth {
  getAuthHeaders = async () => {
    let encodedAuth = btoa(client_id + ':' + secret);
    let authHeaders = {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      Authorization: 'Basic ' + encodedAuth,
    };
    return authHeaders;
  };

  getAccessToken = async (code) => {
    let postData = {
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: redirect_uri,
    };
    let postDataString = queryString.stringify(postData);
    let authHeaders = await this.getAuthHeaders();

    let res = await fetch(accessTokenUrl, {
      method: 'POST',
      body: postDataString,
      headers: authHeaders,
    });
    return res;
  };

  needsRefresh = (timestamp) => {
    if (!timestamp) {
      return true;
    }

    return Date.now() - timestamp > 3600 ? true : false;
  };

  redirectForAuth = async () => {
    // See: https://github.com/reddit-archive/reddit/wiki/OAuth2
    let state = Math.random(),
      authUrl = reddit_host + '/api/v1/authorize',
      authParams = {
        client_id: client_id,
        response_type: 'code',
        state: state,
        redirect_uri: redirect_uri,
        scope: 'read,identity,save,mysubreddits,history',
        duration: 'permanent', // Needed to retrieve refresh token
      };
    let authQueryString = queryString.stringify(authParams);
    window.location = authUrl + '?' + authQueryString;
  };

  objHasCreds = (obj) => {
    // Need a way to share default state with provider and this class
    const redditCreds = {
      accessToken: null,
      lastReceived: null,
      // refreshToken: null
    };
    let keys = _.keys(redditCreds);
    let hasAllRequired = _.every(keys, (k) => obj.hasOwnProperty(k));
    if (!hasAllRequired) {
      debugger;
    }
    return hasAllRequired;
  };

  handleTokenResponse = async (response) => {
    console.log('handleTokenResponse', response.type);

    if (response.type == 'cors') {
      console.log('cors response', response);
      //return;
    }
    let res = await response.json();

    console.log('json response', res.type);
    if (res.error) {
      // debugger;

      // delete localstorage and try again
      console.log('res error', res);
      console.log('removing local vars and re-authorizing');
      localStorage.removeItem('redditRefreshToken');
      localStorage.removeItem('redditCreds');
      this.redirectForAuth();
    } else {
      const { access_token, refresh_token, scope } = res;
      let lastReceived = Date.now() * 0.001;
      localStorage.setItem(
        'redditCreds',
        JSON.stringify({
          accessToken: access_token,
          lastReceived: lastReceived,
        })
      );
      if (refresh_token) {
        localStorage.setItem('redditRefreshToken', refresh_token);
      }
      if (scope) {
        localStorage.setItem('redditScope', scope);
        // make sure read scope is there
        if (
          scope.indexOf('read') === -1 ||
          scope.indexOf('mysubreddits') === -1 ||
          scope.indexOf('history') === -1
        ) {
          // No Code, No Creds, go get the code
          localStorage.removeItem('redditCreds');
          this.redirectForAuth();
        }
      }
      return access_token;
    }
  };

  refreshToken = async (refresh_token) => {
    let refreshRequest = {
      grant_type: 'refresh_token',
      refresh_token: refresh_token,
    };
    let refreshRequestPostData = queryString.stringify(refreshRequest);
    let authHeaders = await this.getAuthHeaders();
    try {
      let refresh_token = await fetch(accessTokenUrl, {
        method: 'POST',
        body: refreshRequestPostData,
        headers: authHeaders,
      });
      let newToken = await this.handleTokenResponse(refresh_token);
      return newToken;
    } catch (error) {
      debugger;
    }
  };

  handleAuth = async () => {
    let redditCreds = JSON.parse(localStorage.getItem('redditCreds'));

    // Queue code for potential auth request
    let parsed = queryString.parse(window.location.search);
    let code = parsed.code,
      name = parsed.name,
      url = parsed.url;

    // Queue refresh token
    let refreshToken = localStorage.getItem('redditRefreshToken');

    if (
      !redditCreds ||
      !redditCreds.accessToken ||
      !redditCreds.lastReceived ||
      !refreshToken
    ) {
      if (code) {
        console.log('code with no creds', code);
        // Use code for token retrieval token retrieval
        let response = await this.getAccessToken(code);
        let accessToken = await this.handleTokenResponse(response);
        return accessToken;
      } else if (name || url) {
        console.log('no name or url', { name, url });
        return false;
      } else {
        // No Code, No Creds, go get the code
        localStorage.removeItem('redditCreds');
        this.redirectForAuth();
      }
    } else if (redditCreds.lastReceived) {
      let needsRefresh = await this.needsRefresh(redditCreds.lastReceived);
      if (needsRefresh) {
        // console.log('needs refresh', refreshToken)
        let newToken = await this.refreshToken(refreshToken);
        if (!newToken) {
          debugger;
        }
        //let accessToken = await this.handleTokenResponse(response);
        return newToken;
      } else {
        // Should be good
        return redditCreds.accessToken;
      }
    }
  };
}
