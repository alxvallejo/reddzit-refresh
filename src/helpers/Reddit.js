import _ from 'lodash';
import { reddit_use_host, reddit_host } from './RedditAuth';
import API_BASE_URL from '../config/api';

import queryString from 'query-string';

class Reddit {
  constructor(props) {
    const { accessToken } = props;
    this.refreshToken(accessToken);
    this.me = null;
  }

  refreshToken = async (accessToken) => {
    this.apiGetHeaders = {
      Authorization: 'bearer ' + accessToken,
    };
    this.apiPostHeaders = {
      Authorization: 'bearer ' + accessToken,
      'Content-Type': 'application/x-www-form-urlencoded',
    };
  };

  getMe = async () => {
    let me = await fetch(API_BASE_URL + '/api/reddit/me', {
      headers: this.apiGetHeaders,
    });
    me = await me.json();
    console.log('me', me);

    // this.setState({ name: me.name })
    this.me = me;
  };

  getSaved = async (params = {}) => {
    if (!this.me) {
      await this.getMe();
    }
    let fetchUrl = API_BASE_URL + '/api/reddit/user/' + this.me.name + '/saved';

    if (params !== {}) {
      let stringified = queryString.stringify(params);
      fetchUrl += '?' + stringified;

      console.log('fetchUrl', fetchUrl);
    }

    let savedResponse = await fetch(fetchUrl, { headers: this.apiGetHeaders });
    let saved = await savedResponse.json();

    let before = saved.data.before;
    let after = saved.data.after;

    saved = _.map(saved.data.children, (child) => {
      return child.data;
    });

    return await {
      saved,
      before,
      after,
    };
  };

  unsave = async (postId) => {
    let postUrl = API_BASE_URL + '/api/reddit/unsave';

    let data = JSON.stringify({
      id: postId,
    });

    let response = await fetch(postUrl, {
      method: 'POST',
      headers: {
        ...this.apiGetHeaders,
        'Content-Type': 'application/json',
      },
      body: data,
    });
    return response;
  };

  getById = async (full_name) => {
    let fetchUrl = API_BASE_URL + '/api/reddit/by_id/' + full_name;
    let response = await fetch(fetchUrl, { headers: this.apiGetHeaders });
    let responseObj = await response.json();
    let post = responseObj.data.children[0].data;
    return post || null;
  };

  save = async (full_name) => {
    let postUrl = API_BASE_URL + '/api/reddit/save';

    let data = JSON.stringify({
      id: full_name,
    });

    let response = await fetch(postUrl, {
      method: 'POST',
      headers: {
        ...this.apiGetHeaders,
        'Content-Type': 'application/json',
      },
      body: data,
    });

    return response;
  };
}

export default Reddit;
