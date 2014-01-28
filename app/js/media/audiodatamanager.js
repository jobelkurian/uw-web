
if (typeof sofia != 'undefined') {
	sofia.audioSources = [];
}

var AudioDataManager = function() {


	
	function getAudioInfo(textInfo, callback) {
				
		var index = 0;
		function doNext() {
			
			var audioSource = sofia.audioSources[index];
			audioSource.getAudioInfo(textInfo, recieveData);
			
			//console.log('-AudioSource', index, textInfo.id);
		}
		function recieveData(audioInfo) {
			
			//console.log('-AudioSource.receiveData', textInfo.id);
			
			// send data back up
			if (audioInfo != null) {
				//console.log('found: ', data);
			
				audioInfo.audioSourceIndex = index;
			
				callback(audioInfo);					
			} else {
				index++;
				
				if (index < sofia.audioSources.length) {
					// try again
					doNext();
					
				} else {
					// didn't find anything						
					callback(null);
				}
				
			}
			
		}
		
		
		doNext();

	
	}
	
	function getFragmentAudio(textInfo, audioInfo, fragmentid, callback) {

		// pass to the correct source using the index number assigned when getAudioInfo was called
		sofia.audioSources[audioInfo.audioSourceIndex].getFragmentAudio(textInfo, audioInfo, fragmentid, callback);
		
	}
	
	
	var audio = {
		getAudioInfo: getAudioInfo,
		getFragmentAudio: getFragmentAudio
	};
	return audio;	
};


var LocalAudio = (function() {

	function getAudioInfo(textInfo, callback) {
		//console.log('LocalAudio', textInfo.id);	
		
		$.ajax({
			dataType: 'json',
			url: 'content/audio/' + textInfo.id + '/info.json',
			success: function(audioInfo) {						
				
				if (!audioInfo.title) {
					audioInfo.title = 'Local';
				}
				
				//console.log('--LocalAudio success', textInfo.id);	
				
				callback(audioInfo);
			},
			error: function(e) {
			
				//console.log('--LocalAudio error', textInfo.id);				
			
				callback(null);				
			}				
		});
	}
	
	function getFragmentAudio(textInfo, audioInfo, fragmentid, callback) {
	
		// split through all the file
		var verseParts = fragmentid.split('_'),
			sectionid = verseParts[0],
			verseNumber = parseInt(verseParts[1], 10),
			fragmentIndex = 0,
			fragmentData = null,
			filename = '';
		
		// look through all the ranges
		/*
		{
			"start": "GN1_1",
			"end": "GN1_31",
			"filename": "GN1",
			"exts": [
				"mp3"
			]
		},				
		*/
		for (var i=0, il=audioInfo.fragments.length; i<il; i++) {
			var fragmentFileinfo = audioInfo.fragments[i],
				startFragmentParts = fragmentFileinfo.start.split('_'),
				startSectionid = startFragmentParts[0];
				
			// if matching chapter then check if verse
			if (sectionid == startSectionid) {
				var startVerseNumber = parseInt(startFragmentParts[1], 10),
					endFragmentParts = fragmentFileinfo.end.split('_'),				
					endVerseNumber = parseInt(endFragmentParts[1], 10);
					
				if (verseNumber >= startVerseNumber && verseNumber <= endVerseNumber) {
					//filename = fragmentFileinfo.filename + '.' + fragmentFileinfo.exts[0];
					
					fragmentIndex = i;
					fragmentData = fragmentFileinfo;
					
					break;					
				}
				
			}
			
		}
		
		if (fragmentData == null) {
			callback(null);
			return;
		}
		
			
		// yeah, we found one!
		var audioData = {
			url: 'content/audio/' + textInfo.id + '/' + fragmentData.filename + '.' + fragmentData.exts[0],
			id: fragmentIndex,
			start: fragmentData.start,
			end: fragmentData.end
		}
		
		callback(audioData);
	}
	
	var audio = {
		getAudioInfo: getAudioInfo,
		getFragmentAudio: getFragmentAudio		
	};
	return audio;	
})();

if (typeof sofia != 'undefined') {
	sofia.audioSources.push(LocalAudio);
}



var FaithComesByHearingAudio = (function() {
	
	var fcbhLocation = null,
		fcbhList = null,
		fcbhIsLoaded = false,
		
		currentTextInfo = null,
		currentCallback = null
		
		
	function init() {
		loadFcbHearingLocations();	 
	}
	
	function loadFcbHearingLocations() {
		$.ajax({
			url: 'http://dbt.io/audio/location?v=2&key=' + sofia.config.fcbhKey,
			success: function(data) {
				fcbhLocation = data;				
			},
			complete: function() {
				loadFcbHearingInfo();
			}			
		});		
	}
	
	function loadFcbHearingInfo() {
		$.ajax({
			url: 'http://dbt.io/library/volume?v=2&media=audio&delivery=web&key=' + sofia.config.fcbhKey,
			success: function(data) {
				fcbhList = data;	
				
				//console.log('FCBH', fcbhLocation, fcbhList);
			
			},
			complete: function() {
				fcbhIsLoaded = true;
				
				attemptGetAudioInfo();
			}			
		});		
	}	
	

	function getAudioInfo(textInfo, callback) {
	
		// store
		currentTextInfo = textInfo;
		currentCallback = callback;
	
		// attempt
		attemptGetAudioInfo();
	}
	
	function attemptGetAudioInfo() {
		
		// check for FCBH info hardcoded in the textInfo object
		if (currentTextInfo != null) {
			var fcbhKeys = ['fcbh_audio_nt','fcbh_audio_ot','fcbh_drama_nt','fcbh_drama_ot'],
				fcbhExists = false,
				audioData = {title: 'FCBH'};
			
			for (var i=0, il=fcbhKeys.length; i<il; i++) {
				var key = fcbhKeys[i],
					keyData = currentTextInfo[ key ];
					
				audioData[key] = keyData;	
					
				if (keyData && keyData != '') {
					fcbhExists = true;					
				}				
			}
			
			if (fcbhExists) {
				currentCallback(audioData);
				
				currentTextInfo = null;
				currentCallback = null;	
			}			
		}
	
		// if not in textInfo, then we need to look it up from the FCBH data
		if (fcbhIsLoaded && currentTextInfo != null && currentCallback != null) {
				
			var audioData = {
				title: 'FCBH',
				fcbh_audio_nt: getFbchCollection(currentTextInfo, 'non-drama', 'nt'),
				fcbh_audio_ot: getFbchCollection(currentTextInfo, 'non-drama', 'ot'), 
				fcbh_drama_nt: getFbchCollection(currentTextInfo, 'drama', 'nt'),
				fcbh_drama_ot: getFbchCollection(currentTextInfo, 'drama', 'ot')
			};
				
			currentCallback(audioData);
			
			currentTextInfo = null;
			currentCallback = null;
		}
	}
	
	function getFbchCollection(textInfo, mediaType, testament ) {
				
		var 
			// our attempt to find a fake dam_id (real: ENGESVN2DA and ENGESVO2DA)
			dam_id_start = textInfo.id.replace(/[-_]/gi, '').toUpperCase(),
			results = [];
	

		// match dam_id
		for (var i=0, il = fcbhList.length; i<il; i++) {
			var fbchCollection = fcbhList[i];
	
			if (fbchCollection.dam_id && fbchCollection.dam_id.indexOf(dam_id_start) > -1) {
				results.push(fbchCollection);
			}
		}
		
		// if no dam_id match, then try language
		if (results.length == 0 && textInfo.lang != 'eng') {
			// dam_id
			for (var i=0, il = fcbhList.length; i<il; i++) {
				var fbchCollection = fcbhList[i];
		
				if (fbchCollection.language_iso && fbchCollection.language_iso == textInfo.lang) {
					results.push(fbchCollection);
				} 
			}
		}
		
		// if no dam_id or langauge match, try family code
		if (results.length == 0 && textInfo.lang != 'eng') {
			// dam_id
			for (var i=0, il = fcbhList.length; i<il; i++) {
				var fbchCollection = fcbhList[i];
		
				if (fbchCollection.language_family_iso && fbchCollection.language_family_iso == textInfo.lang) {
					results.push(fbchCollection);
				} 
			}
		}		
		
		// filter by testament if needed
		if (testament != '') {
			var testamentResults = [];
			
			for (var i=0, il = results.length; i<il; i++) {
				var fbchCollection = results[i];
		
				if (fbchCollection.collection_code && fbchCollection.collection_code.toLowerCase() == testament) {
					testamentResults.push(fbchCollection);
				}
			}	
			
			results = testamentResults;		
		}
		
		// filter by mediaType ('drama' or 'non-drama') if possible
		if (mediaType != '') {
			var mediaTypeResults = [];
			
			for (var i=0, il = results.length; i<il; i++) {
				var fbchCollection = results[i];
		
				if (fbchCollection.media_type && fbchCollection.media_type.toLowerCase() == mediaType) {
					mediaTypeResults.push(fbchCollection);
				} 
			}
			
			if (mediaTypeResults.length > 0) {
				results = mediaTypeResults;
			}			
		}					
		
		if (results.length > 0) {
			return results[0].dam_id;
		} else {
			return null;
		}
	}	
	
	function getFragmentAudio(textInfo, audioInfo, fragmentid, callback) {
		if (audioInfo == null) {
			callback(null);
			return;
		}
		
		// find the right dam_id for this audio fragment
		var 
			fragmentparts = fragmentid.split('_'),
			sectionid = fragmentparts[0],
			dbsBookCode = sectionid.substr(0,2),
			chapterNum = sectionid.substr(2),					
			bookInfo = bible.BOOK_DATA[dbsBookCode],
			testament = bible.OT_BOOKS.indexOf(dbsBookCode) > -1 ? 'ot' : 
						bible.NT_BOOKS.indexOf(dbsBookCode) > -1 ? 'nt' : '',
			dramaKey = 'fcbh_drama_' + testament,
			audioKey = 'fcbh_audio_' + testament,
			dam_id = '';
			
		
		// apocrypha!
		if (testament == '') {
			callback(null);
			return;			
		}
		
		// find correct damID
		if (audioInfo[dramaKey] && audioInfo[dramaKey] != '') {
			dam_id = audioInfo[dramaKey];
		} if (audioInfo[audioKey] && audioInfo[audioKey] != '') {
			dam_id = audioInfo[audioKey];
		}
		
		var
			url = 'http://dbt.io/audio/path?v=2&dam_id=' + dam_id + '&book_id=' + bookInfo.osis.toLowerCase() + '&chapter_id=' + chapterNum.toString() + '&key=' + sofia.config.fcbhKey;
			
		$.ajax({
			url: url,
			success: function(pathData) {
				
				if (pathData.length == 0) {
					callback(null);
					return;
				}
				
				var server = fcbhLocation[0],
					url = server.protocol + "://" + server.server + server.root_path + "/" + pathData[0].path,
					audioData = {
						id: sectionid,
						url: url,
						start: sectionid + '_1',
						end: ''
					};
				
				if (callback) {
					callback(audioData);
				}
			},
			error: function(a,b,c,d) {
				
				console.log('FCBH location error', a,b,c,d);
		
				if (callback) {
					callback(null);						
				}
			}
		});		
				
	}
	
	var audio = {
		getAudioInfo: getAudioInfo,
		getFragmentAudio: getFragmentAudio,
		getFbchCollection: getFbchCollection,
		getFragmentAudio: getFragmentAudio,
		fcbhIsLoaded: fcbhIsLoaded	
	};

	init();
	
	return audio;	
})();

if (typeof sofia != 'undefined') {
	if (sofia.config.enableOnlineSources) {

		sofia.audioSources.push(FaithComesByHearingAudio);
	}
}


