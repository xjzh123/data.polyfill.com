import express from 'express';
var router = express.Router();
import algoliasearch from 'algoliasearch';
import { GetContentFromRedis, SaveContentToRedis } from '../db/redis.js';
import * as CONST from '../utils/const.js';
import dotenv from 'dotenv';
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.development' });
} else {
  dotenv.config({ path: '.env' });
}

const client = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_API_KEY);

router.get('/', async (req, res) => {

  /// if already exist in cache, send it
  const cacheData = await GetContentFromRedis(req.originalUrl);
  if (cacheData != null) {
      console.log('loading from redis', req.originalUrl);
      res.send(cacheData);
      return;
  }

  const searchText = req.query.search;
  const searchPage = req.query.page || 0;
  const facetFilters = req.query.filter || '';

  try {
    const index = client.initIndex('npm-search');
    let searchOptions = {};
    if (facetFilters !== '') {
      searchOptions = {
        hitsPerPage: 10,
        page: searchPage,
        attributesToRetrieve: ["deprecated", "description", "githubRepo", "homepage", "keywords", "license", "name", "owner", "version", "popular", "moduleTypes", "styleTypes", "jsDelivrHits"],
        facetFilters: facetFilters
      };
    } else {
      searchOptions = {
        hitsPerPage: 10,
        page: searchPage,
        attributesToRetrieve: ["deprecated", "description", "githubRepo", "homepage", "keywords", "license", "name", "owner", "version", "popular", "moduleTypes", "styleTypes", "jsDelivrHits", "downloadsLast30Days"]
      };
    }

    const { hits, nbPages, page } = await index.search(searchText, searchOptions);
    if (hits.length > 0) {
      const data = hits.map(item => {
        // console.log(item);
        return {
          name: item.name,
          author: item.owner.name,
          avatar: item.owner.avatar,
          version: item.version,
          description: item.description,
          popular: item.popular,
          moduleTypes: item.moduleTypes,
          styleTypes: item.styleTypes,
          license: item.license,
          keywords: item.keywords,
          github_url: item.owner.link,
          homepage: item.homepage,
          downloads: item.jsDelivrHits,
        }
      });
      const respData = { result: true, data: data, page: page, totalPages: nbPages };
      await SaveContentToRedis(req.originalUrl, JSON.stringify(respData), CONST.EXPIRE_MONTH);
      res.json(respData);
    } else {
      res.json({ result: false, data: [] })
    }
  } catch (error) {
    res.json({ error: error.message });
  }
})

export default router;
