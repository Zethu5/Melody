const ytdl              = require('ytdl-core');
const { google }        = require('googleapis');
const { YOUTUBE_TOKEN } = require('./config.json')

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

async function getYoutubeVideoName(youtubeVideoUrl) {
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

async function getVideoMetadata(youtubeVideoId) {
    const videoMetadata = await google.youtube('v3').videos.list({
        key: YOUTUBE_TOKEN,
        part: ['contentDetails'],
        id: youtubeVideoId
    });

    return videoMetadata;
}

async function getVideoLengthInSeconds(youtubeVideoId) {
    const youtubeVideoMetadata = await getVideoMetadata(youtubeVideoId);
    const videoDuration = youtubeVideoMetadata.data.items[0].contentDetails.duration;
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

exports.getYoutubeVideoId       = getYoutubeVideoId;
exports.getYoutubePlaylistId    = getYoutubePlaylistId;
exports.getYoutubeVideoName     = getYoutubeVideoName;
exports.getYoutubePlaylistName  = getYoutubePlaylistName;
exports.getYoutubePlaylistSongs = getYoutubePlaylistSongs;
exports.getVideoMetadata        = getVideoMetadata;
exports.getVideoLengthInSeconds = getVideoLengthInSeconds
