var fs = require('fs'),
  iso2iana = require('./iso2iana.js'),
	breakChar = '\n';


var bibleFormatter = {

	breakChar: breakChar,

	formatChapterCode: function(dbsCode, chapterNum) {
		return dbsCode + chapterNum.toString();
	},

	formatVerseCode: function(dbsCode, chapterNum, verseNum) {
		return dbsCode + chapterNum.toString() + '_' + verseNum.toString();
	},

	openDocument: function(title, dir, className) {
		return '<!DOCTYPE html>' + breakChar +
				'<html>' + breakChar +
				'<head>' + breakChar +
					'<meta charset="utf-8" />' + breakChar +
					'<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />' + breakChar +
					'<title>' + title + '</title>' + breakChar +
					'<link href="../../../build/mobile.css" rel="stylesheet" />' + breakChar +
					'<script src="../../../build/mobile.js"></script>' + breakChar +
				'</head>' + breakChar +
				'<body dir="' + dir + '" class="' + className + '">' + breakChar;
	},

	closeDocument: function(info, chapterData) {
		return 	'</body>' + breakChar +
				'</html>';
	},


	openVersionIndex: function(info) {

		return this.openDocument(info.name + ' (' + info.abbr + ')', info.dir, 'text-index') +
				'<div class="header"><div class="nav">' + breakChar +
					'<span class="name">' + info.name + '</span>' +
					'<a class="home" href="../index.html">&#9776;</a>' +
				'</div></div>' + breakChar +
				'<ul class="division-list">' + breakChar;

	},

	closeVersionIndex: function(info, chapterData) {
		return 	'</ul>' + breakChar +
				this.closeDocument();
	},

	openBookIndex: function(info, bookName) {

		return this.openDocument(bookName + ' (' + info.abbr + ')', info.dir, 'division-index') +
				'<div class="header"><div class="nav">' + breakChar +
					'<span class="name">' + bookName + '</span>' + breakChar +
					'<a class="home" href="index.html">&#9776;</a>' + breakChar +
				'</div></div>' + breakChar +
				'<ul class="section-list">' + breakChar;

	},

	closeBookIndex: function(info, chapterData) {
		return 	'</ul>' + breakChar +
				this.closeDocument();
	},


	openAboutPage: function(info) {

		return this.openDocument(info.name + ' (' + info.abbr + ')', info.dir, 'about') +
				'<h1>' + info.name + ' (' + info.abbr + ')' + '</h1>'  + breakChar +
				'<dl>' + breakChar;

	},

	closeAboutPage: function(info, chapterData) {
		return 	'<dt>Generated</dt><dd>' + (new Date	()) + '</dd>' +
				'<dt>Generator</dt><dd>Node.js Tools</dd>' +
				'</dl>' + breakChar +
				this.closeDocument();
	},

	// neato ones
	//homeButton: '&#9776;',
	//rightArrow: '&#9658;',
	//leftArrow: '&#9668;',

	homeButton: '=',
	rightArrow: '&gt;',
	leftArrow: '&lt;',


	openChapterDocument: function(info, chapterData) {

		var sectionid = chapterData.id,
			sectionDbsCode = sectionid.substr(0,2),
			sectionChapterNumber = sectionid.substr(2);
			chapterTitle = info.divisionNames[ info.divisions.indexOf(sectionDbsCode) ] + ' ' + sectionChapterNumber;

		return  this.openDocument(chapterTitle + ' (' + info.abbr + ')', info.dir, 'section-document') +
				'<div class="header"><div class="nav">' + breakChar +
					'<a class="name" href="' + sectionDbsCode + '.html">' + info.name + '</a>' +
					'<a class="location" href="' + sectionDbsCode + '.html">' + chapterTitle + '</a>' +
					(chapterData.previd != null ? '<a class="prev" href="' + chapterData.previd + '.html">' + this.leftArrow + '</a>' : '') + breakChar +
					'<a class="home" href="index.html">' + this.homeButton + '</a>' + breakChar +
					(chapterData.nextid != null ? '<a class="next" href="' + chapterData.nextid + '.html">' + this.rightArrow + '</a>' + breakChar : '') +
				'</div></div>' + breakChar;
	},

	closeChapterDocument: function(info, chapterData) {
		return breakChar +
				'<div class="footer"><div class="nav">' + breakChar +
					(chapterData.previd != null ? '<a class="prev" href="' + chapterData.previd + '.html">' + this.leftArrow + '</a>' : '') + breakChar +
					'<a class="home" href="index.html">' + this.homeButton + '</a>' + breakChar +
					(chapterData.nextid != null ? '<a class="next" href="' + chapterData.nextid + '.html">' + this.rightArrow + '</a>' + breakChar : '') +
				'</div></div>' + breakChar +
				this.closeDocument();
	},

	openChapter: function(info, chapterData, classes) {

		//<div class="section chapter
		var type = info.type;
		if (typeof type == 'undefined' || type == 'bible') {
			type = 'chapter';
		}
		
		classes = classes || '';

		var chapterHtml =  '<div class="section ' + type + ' ' + chapterData.id.substr(0,2) + ' ' + chapterData.id + ' ' + info.id + ' ' + info.lang + ' ' + classes + '"' +
					(info.dir ? ' dir="' + info.dir + '"' : '') +
					(info.lang ? ' lang="' + iso2iana.convert(info.lang) + '"' : '') +
					' data-id="' + chapterData.id + '"' +
					' data-nextid="' + chapterData.nextid + '"' +
					' data-previd="' + chapterData.previd + '"' +
					'>' + breakChar;


		return chapterHtml;
	},

	closeChapter: function() {
		var closeChapter = breakChar + '</div>';

		return closeChapter;
	},


	openVerse: function(dbsVerseCode, verseNumber) {
		return 	(typeof verseNumber != 'undefined' && verseNumber != null ? '<span class="v-num v-' + verseNumber + '">' + verseNumber + '&nbsp;</span>' : '') +
				'<span class="v ' + dbsVerseCode + '" data-id="' + dbsVerseCode + '">';
	},

	closeVerse: function() {
		return '</span>' + breakChar;
	}

}


module.exports = bibleFormatter;
