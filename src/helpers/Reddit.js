import _ from 'lodash';
import { reddit_use_host, reddit_host } from './RedditAuth';

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
    let me = await fetch(reddit_use_host + '/api/v1/me', {
      headers: this.apiGetHeaders,
    });
    me = await me.json();
    console.log('me', me);

    // this.setState({ name: me.name })
    this.me = me;
  };

  getSaved = async (params = {}) => {
    let fetchUrl = reddit_use_host + '/user/' + this.me.name + '/saved';

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
    let postUrl = reddit_use_host + '/api/unsave';

    let data = queryString.stringify({
      id: postId,
    });

    let response = await fetch(postUrl, {
      method: 'POST',
      headers: this.apiPostHeaders,
      body: data,
    });
    return response;
  };

  getById = async (full_name) => {
    let fetchUrl = reddit_use_host + '/by_id/' + full_name;
    let response = await fetch(fetchUrl, { headers: this.apiGetHeaders });
    let responseObj = await response.json();
    let post = responseObj.data.children[0].data;
    return post || null;
  };

  save = async (full_name) => {
    let postUrl = reddit_use_host + '/api/save';

    let data = queryString.stringify({
      id: full_name,
    });

    let response = await fetch(postUrl, {
      method: 'POST',
      headers: this.apiPostHeaders,
      body: data,
    });

    return response;
  };
}

export default Reddit;
