import express from 'express';
var router = express.Router();
import algoliasearch from 'algoliasearch';
import searchdata from '../fake/algoliasearch.json' assert { type: 'json' };

import dotenv from 'dotenv';
if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: '.env.development' });
} else {
    dotenv.config({ path: '.env' });
}

const client = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_API_KEY);

router.get('/', async (req, res) => {
    const searchText = req.query.search;
    const searchPage = req.query.page || 0;

    if (searchText === undefined || searchText === '') {
        res.status(400).send("Bad Request!");
        return;
    }

    if (process.env.NODE_ENV === 'development') {
        const { hits, nbPages, page } = searchdata;
        if (hits.length > 0) {
            const data =  hits.map(item=>{
               // console.log(item);
                return {
                    name: item.name,
                    author: item.owner.name,
                    avatar: item.owner.avatar,
                    version: item.version,
                    description: item.description,
                    popular: true,
                    moduleTypes: item.moduleTypes,
                    styleTypes: item.styleTypes,
                    license: item.license,
                    keywords: item.keywords,
                    github_url: item.owner.link,
                    homepage: item.homepage
                }
            });
            res.json({result: true, data: data, page: page, totalPages: nbPages});
        } else {
            res.status(404).json({result: false, data: []})
        }
    } else {
        try {
            const index = client.initIndex('npm-search');
            const {hits, nbPages, page} = await index.search(searchText, {hitsPerPage: 10, page: searchPage});
            if (hits.length > 0) {
                const data =  hits.map(item=>{
                    // console.log(item);
                    return {
                        name: item.name,
                        author: item.owner.name,
                        avatar: item.owner.avatar,
                        version: item.version,
                        description: item.description,
                        popular: true,
                        moduleTypes: item.moduleTypes,
                        styleTypes: item.styleTypes,
                        license: item.license,
                        keywords: item.keywords,
                        github_url: item.owner.link,
                        homepage: item.homepage
                    }
                });
                res.json({result: true, data: data, page: page, totalPages: nbPages});
            } else {
                res.status(404).json({result: false, data: []})
            }
        } catch (error) {
            res.json({ error: error.message });
        }
    }
})

router.get('/:package', async (req, res) => {
    const pkgName = req.params.package;
    if (pkgName === undefined || pkgName === '') {
        res.status(400).send("Bad Request!");
        return;
    }

    res.send(pkgName);
})


export default router;
