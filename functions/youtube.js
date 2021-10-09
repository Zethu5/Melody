const ytdl              = require('ytdl-core');
const { google }        = require('googleapis');
const CONFIG_FILE       = '../config.json';
const { YOUTUBE_TOKEN } = require(CONFIG_FILE)

function getYoutubeVideoId(youtubeVideoUrl) {
    if(ytdl.validateURL(youtubeVideoUrl)) {
        try {
            const youtubeVideoId = ytdl.getURLVideoID(youtubeVideoUrl);
            return youtubeVideoId;
        } catch (error) {
            console.error(error)
            return null;
        }
    }
    return null;
}

async function getYoutubePlaylistId(youtubePlaylistUrl) {
    let youtubePlaylistId = null;

    if(youtubePlaylistUrl.match(/[&?]list=([^&]+)/)) {
        youtubePlaylistId = youtubePlaylistUrl.match(/[&?]list=([^&]+)/)[0].replace(/^\&list\=/,'');
    }

    const youtubePlaylistName = await getYoutubePlaylistName(youtubePlaylistId);

    if(youtubePlaylistName != null) {
        return youtubePlaylistId;
    }
    return null;
}

async function getYoutubeVideoDataByUrl(youtubeVideoUrl) {
    const youtubeVideoId = getYoutubeVideoId(youtubeVideoUrl);

    const youtubeResponse = await google.youtube('v3').videos.list({
        key: YOUTUBE_TOKEN,
        part: 'snippet',
        id: youtubeVideoId
    });

    if(youtubeResponse.data.items.length > 0) {
        return youtubeResponse.data.items[0];
    }
    return null;
}

async function getYoutubeVideoDataById(youtubeVideoId) {
    const youtubeResponse = await google.youtube('v3').videos.list({
        key: YOUTUBE_TOKEN,
        part: 'snippet',
        id: youtubeVideoId
    });

    if(youtubeResponse.data.items.length > 0) {
        return youtubeResponse.data.items[0];
    }
    return null;
}

async function getYoutubeVideoNameByUrl(youtubeVideoUrl) {
    const youtubeVideoId = getYoutubeVideoId(youtubeVideoUrl);

    const youtubeResponse = await google.youtube('v3').videos.list({
        key: YOUTUBE_TOKEN,
        part: 'snippet',
        id: youtubeVideoId
    });

    if(youtubeResponse.data.items.length > 0) {
        return youtubeResponse.data.items[0].snippet.title;
    }
    return null;
}

async function getYoutubeVideoNameById(youtubeVideoId) {
    const youtubeResponse = await google.youtube('v3').videos.list({
        key: YOUTUBE_TOKEN,
        part: 'snippet',
        id: youtubeVideoId
    });

    if(youtubeResponse.data.items.length > 0) {
        return youtubeResponse.data.items[0].snippet.title;
    }
    return null;
}

async function getYoutubePlaylistName(youtubePlaylistId) {
    const playlistResult = await google.youtube('v3').playlists.list({
        key: YOUTUBE_TOKEN,
        part: 'snippet',
        id: youtubePlaylistId
    });

    if(playlistResult.data.items.length > 0) {
        return playlistResult.data.items[0].snippet.title;
    }
    return null;
}

async function getYoutubePlaylistSongs(youtubePlaylistId) {
    let nextPageToken = null;
    let youtubePlaylistSongs = [];

    do {
        const playlistResult = await google.youtube('v3').playlistItems.list({
            key: YOUTUBE_TOKEN,
            maxResults: 50,
            pageToken: nextPageToken,
            part: ['snippet', 'status'],
            playlistId: youtubePlaylistId
        });
        
        youtubePlaylistSongs.push(...playlistResult.data.items)
        nextPageToken = playlistResult.data.nextPageToken;
    } while(nextPageToken)

    // get only public videos
    return youtubePlaylistSongs.filter(x => x.status.privacyStatus === 'public');
}

async function getVideoLengthInSeconds(youtubeVideoId) {
    const youtubeVideoData = await getYoutubeVideoDataById(youtubeVideoId);

    if(youtubeVideoData == null) {
        return;
    }

    const videoDuration = youtubeVideoData.contentDetails.duration;
    const durationArray = videoDuration.replace(/^PT/,'').replace(/S$/,'').split(/[HM]/).map(x => Number(x));

    switch(durationArray.length) {
        case 3:
            return durationArray[0] * 60 * 60 + durationArray[1] * 60 + durationArray[2];
        case 2:
            return durationArray[0] * 60 + durationArray[1]
        case 1:
            return durationArray[0];
    }
}

async function getVideoByKeyWords(keyWords) {
    try {
        const searchResults = await google.youtube('v3').search.list({
            key: YOUTUBE_TOKEN,
            maxResults: 1,
            order: 'relevance',
            part: 'snippet',
            q: keyWords
        });

        if(searchResults.data.items.length > 0) {
            return searchResults.data.items[0].id.videoId
        }

        return null
    } catch (error) {
        return error.code;
    }
}

exports.getYoutubeVideoId            = getYoutubeVideoId;
exports.getYoutubePlaylistId         = getYoutubePlaylistId;
exports.getYoutubeVideoNameByUrl     = getYoutubeVideoNameByUrl;
exports.getYoutubeVideoNameById      = getYoutubeVideoNameById;
exports.getYoutubePlaylistName       = getYoutubePlaylistName;
exports.getYoutubePlaylistSongs      = getYoutubePlaylistSongs;
exports.getVideoLengthInSeconds      = getVideoLengthInSeconds;
exports.getVideoByKeyWords           = getVideoByKeyWords;
exports.getYoutubeVideoDataByUrl     = getYoutubeVideoDataByUrl;