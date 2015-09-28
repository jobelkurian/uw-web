sofia.config = $.extend(sofia.config, {

	enableBibleSelectorTabs: true,
	bibleSelectorDefaultList: ['eng-NASB']

});



/******************
TextChooser
*******************/

var TextChooser = function(container, target, text_type) {
	// create me
	var
		isFull = false,
		textsHaveRendered = false,
		selectedTextInfo = null,
		textSelector = $('<div class="text-chooser nav-drop-list">' +
							'<span class="up-arrow"></span>' +
							'<span class="up-arrow-border"></span>' +
							'<div class="text-chooser-header">' +								
								'<div class="text-chooser-selector">' + 
									'<span class="text-chooser-default selected i18n" data-mode="default" data-i18n="[html]windows.bible.default"></span>' +
									'<span class="text-chooser-languages i18n" data-mode="languages" data-i18n="[html]windows.bible.languages"></span>' +
									'<span class="text-chooser-countries i18n" data-mode="countries" data-i18n="[html]windows.bible.countries"></span>' +
								'</div>' +							
								'<input type="text" class="text-chooser-filter-text i18n" data-i18n="[placeholder]windows.bible.filter" />' +						
								'<span class="close-button">Close</span>' +
							'</div>' +
							'<div class="text-chooser-main"></div>' +
							
						'</div>')
						.appendTo( $('body') )
						.hide(),
		header = textSelector.find('.text-chooser-header'),
		main = textSelector.find('.text-chooser-main'),
		listselector = textSelector.find('.text-chooser-selector'),
		defaultSelector = textSelector.find('.text-chooser-default'),
		languagesSelector = textSelector.find('.text-chooser-languages'),
		countriesSelector = textSelector.find('.text-chooser-countries'),				
		filter = textSelector.find('.text-chooser-filter-text'),
		title = textSelector.find('.text-chooser-title'),
		closeBtn = textSelector.find('.close-button').hide(),
		allTextsVisible = false,
		hasDefaultTexts = false,
		recentlyUsedKey = 'text-recently-used',
		recentlyUsed = AppSettings.getValue(recentlyUsedKey, {"recent":[]} ),
		list_data = null;

	textSelector.find('.i18n').i18n();

	title.html("Texts");

	closeBtn.on('click', hide);
	
	if (sofia.config.enableBibleSelectorTabs) {
	
		listselector.on('click', 'span', function() {
			$(this)
				.addClass('selected')
				.siblings()
					.removeClass('selected');
					
			filter.val('');
					
			renderTexts(list_data);			
		});
		
	
	} else {
		listselector.hide();
	}


	filter.on('keyup keypress', filterVersions);

	filter.on('focus', function() {
		if (Detection.hasTouch) {
			filter.blur();
		}
	});

	function filterVersions(e) {

		// when the user presses return and there is only one version, attempt to go to that one
		if (e && e.which == 13) {
			var visibleRows = main.find('.text-chooser-row:visible');

			if (visibleRows.length == 1) {

				visibleRows.click();

				filter.val('');
				return;
			}
		}

		var text = filter.val().toLowerCase();

		
		
		if (text == '') {
			renderTexts(list_data);
			updateRecentlyUsed();
		} else {

			// filter by type
			var arrayOfTexts = list_data;
			
			arrayOfTexts = arrayOfTexts.filter(function(t) {
				var thisTextType = typeof t.type == 'undefined' ? 'bible' : t.type;	
				return thisTextType == text_type;
			});
			
			var html = [];
			
			for (var i=0, il=arrayOfTexts.length; i<il; i++) {
				var textInfo = arrayOfTexts[i],
					hasMatch = 	textInfo.name.toLowerCase().indexOf(text) > -1 ||
								textInfo.abbr.toLowerCase().indexOf(text) > -1 ||
								textInfo.langName.toLowerCase().indexOf(text) > -1 ||
								textInfo.langNameEnglish.toLowerCase().indexOf(text) > -1;
								
												
				if (hasMatch) {
					html.push (
						createTextRow(textInfo, false, '')
					);
				}
				
			}
			
			
			main.html('<table cellspacing="0">' + html.join('') + '</table>');		
			
		}
		
		
		
		
		return;

		if (text == '') {

			// remove all filtering from bibles
			main.find('.text-chooser-row')
					.removeClass('filtered')
					
			// remove filters from headers
			main.find('.text-chooser-row-header')
					.show();
					
			updateRecentlyUsed();

		} else {
		
			var mode = getMode();
			
			if (mode == 'languages' || mode == 'default' || mode == 'none') {

				// hide the headers
				main.find('.text-chooser-row-header').hide();
	
				main.find('.text-chooser-row').each(function() {
					var row = $(this),
						abbr = row.find('.text-chooser-abbr'),
						name = row.find('.text-chooser-name');
	
					if (
						row.attr('data-lang-name').toLowerCase().indexOf(text) > -1 ||
						row.attr('data-lang-name-english').toLowerCase().indexOf(text) > -1 ||
						name.text().toLowerCase().indexOf(text) > -1 ||
						abbr.text().toLowerCase().indexOf(text) > -1) {
	
						row.show().addClass('filtered');
	
					} else {
	
						row.hide().removeClass('filtered');
	
					}
	
				});
	
				// remove the recently used so there are no duplicates
				main.find('.text-chooser-recently-used').hide().addClass('filtered');
			
			} else if (mode == 'countries') {
								
				main.find('.text-chooser-row-header').each(function() {
					var row = $(this),
						name = row.find('.name');
	
					if (name.text().toLowerCase().indexOf(text) > -1) {
	
						row.show().addClass('filtered');
	
					} else {
	
						row.hide().removeClass('filtered');
	
					}
	
				});
				
			}

		}

	}

	// handle when user clicks on a text
	textSelector.on('click', '.text-chooser-row', function() {
		var row = $(this),
			textid = row.attr('data-id');

		row.addClass('selected')
			.siblings()
			.removeClass('selected');


		TextLoader.getText(textid, function(data) {
			selectedTextInfo = data;

			hide();

			storeRecentlyUsed(selectedTextInfo);

			updateRecentlyUsed();

			//console.log('chooser:change:click', selectedTextInfo);
			ext.trigger('change', {type:'change', target: this, data: selectedTextInfo});

		});

	});


	function storeRecentlyUsed(textInfo) {

		if (textInfo.type != 'bible') {
			return;
		}

		// look for this version
		var existingVersions = recentlyUsed.recent.filter(function(t) {
			return t.id == textInfo.id;
		});

		if (existingVersions.length == 0) {

			// store recent text
			recentlyUsed.recent.unshift(textInfo);

			// limit to 5
			while (recentlyUsed.recent.length > 5 ) {
				recentlyUsed.recent.pop();
			}
		}

		//console.log('storeRecentlyUsed',recentlyUsed.recent.length);

		// save
		AppSettings.setValue(recentlyUsedKey, recentlyUsed);
	}

	function updateRecentlyUsed() {

		if (text_type != 'bible' || getMode() != 'default') {
			main.find('.text-chooser-recently-used').remove();
			return;
		}

		// RECENTly Used
		if (recentlyUsed.recent.length > 0) {

			var isDefaultText = false;

			// find if this should be a priority text shown at the beginning
			if (sofia.config.topTexts && sofia.config.topTexts.length > 0) {
				isDefaultText = true;
			}

			var recentlyUsedHtml =
					createHeaderRow(			
						'',
						i18n.t('windows.bible.recentlyused'),
						'',
						'',
						'text-chooser-recently-used' + (isDefaultText ? ' is-default-text' : '')
					);

			for (var i=0, il=recentlyUsed.recent.length; i<il; i++) {
				var textInfo = recentlyUsed.recent[i];


				recentlyUsedHtml +=
					createTextRow(textInfo, isDefaultText, 'text-chooser-recently-used' );

			}

			// remove existing
			main.find('.text-chooser-recently-used').remove();

			// add update recent stuff
			var recentRow = $(recentlyUsedHtml);
			main.find('table tbody').prepend(recentRow);
		}

	}


	function checkIsDefaultText(id) {

		var isDefaultText = false,
			parts = id.split(':'),
			textid = parts.length > 1 ? parts[1] : parts[0];

		// find if this should be a priority text shown at the beginning
		if (sofia.config.bibleSelectorDefaultList && sofia.config.bibleSelectorDefaultList.length > 0) {

			for (var t=0, tl=sofia.config.bibleSelectorDefaultList.length; t<tl; t++) {
				if (textid == sofia.config.bibleSelectorDefaultList[t]) {
					isDefaultText = true;
					break;
				}
			}

		} else {
			isDefaultText = false;
		}


		return isDefaultText;

	}
	
	function getMode() {
		if (sofia.config.enableBibleSelectorTabs) { 
			var mode = listselector.find('.selected').data('mode');
			return mode;
		} else {
			return 'none';
		}
	}

	function renderTexts(data) {

		// render all the rows
		var html = [],
			arrayOfTexts = data,
			mode = getMode();
			
		if (mode == 'languages' || mode == 'default' || mode == 'none') {
	
			// filter by type
			arrayOfTexts = arrayOfTexts.filter(function(t) {
				var thisTextType = typeof t.type == 'undefined' ? 'bible' : t.type;
	
				return thisTextType == text_type;
			});
	
			// find languages
			var languages = [];
			for (var index in arrayOfTexts) {
				var text = arrayOfTexts[index];

				if (languages.indexOf(text.langName) == -1) {
					languages.push( text.langName );
				}
			}

			// remove pinned
			var pinnedIndex = -1;
			if (sofia.config.pinnedLanguage && sofia.config.pinnedLanguage != '') {

				var pinnedIndex = languages.indexOf(sofia.config.pinnedLanguage);
				if (pinnedIndex > -1) {
					// pull it out
					languages.splice(pinnedIndex, 1);
				}
			}

			// sort
			languages.sort();

			// put it back in
			if (pinnedIndex > -1) {
				languages.splice(0,0, sofia.config.pinnedLanguage);
			}

			for (var index in languages) {

				// get all the ones with this language
				var langName = languages[index],
					textsInLang = arrayOfTexts.filter(function(t) { if (t.langName == langName) { return t; } }),
					hasDefaultText = false,
					langHtml = [];

				// sort the texts by name
				textsInLang = textsInLang.sort(function(a,b) {
					if (a.name == b.name) {
						return 0;
					} else if (a.name > b.name) {
						return 1;
					} else if (a.name < b.name) {
						return -1;
					}
				});

				// create HTML for the texts
				for (var textIndex in textsInLang) {
					var text = textsInLang[textIndex],
						isDefaultText = checkIsDefaultText(text.id);

					if (mode == 'none' || mode == 'languages' || (isDefaultText && mode == 'default')) {
						langHtml.push(
							createTextRow(
									text, 
									isDefaultText, 
									mode == 'languages' ? 'collapsed' : ''
							)
						);
					}
			
					if (!hasDefaultText && isDefaultText) {
						hasDefaultText = true;
					}
				}

				if (mode == 'none' || mode == 'languages' || (hasDefaultText && mode == 'default')) {
					html.push(
						createHeaderRow(
							'',
							textsInLang[0].langName +
									( textsInLang[0].langName != textsInLang[0].langNameEnglish && typeof textsInLang[0].langNameEnglish != 'undefined' ? ' (' + textsInLang[0].langNameEnglish + ')' : ''),
							'',
							'',
							mode == 'languages' ? 'collapsible-language collapsed' : ''
						)
					);
				}
				
				html.push(langHtml.join(''));

			}
	
	
			main.html('<table cellspacing="0" class="' + (mode == 'languages' ? 'collapsible' : '') + '">' + html.join('') + '</table>');
	
			updateRecentlyUsed();
	
			// find the selected text
			if (selectedTextInfo != null) {
				textSelector
						.find('[data-id="' + selectedTextInfo.id + '"]')
						.addClass('selected');
			}

		} else if (mode == "countries") {
			
			textSelector.removeClass('show-more');
		
			for (var i=0, il=sofia.countries.length; i<il; i++) {
				
				var countryInfo = sofia.countries[i],
					textsInCountry = arrayOfTexts.filter(function(t) {
						return typeof t.countries != 'undefined' && t.countries.indexOf(countryInfo["alpha-2"]) > -1;					
					});
				
				
				if (textsInCountry.length > 0) {
					html.push(
						createHeaderRow(countryInfo["alpha-3"], 
							countryInfo.name, 
							'', 
							'<img src="' + sofia.config.baseContentUrl + 'content/countries/' + countryInfo["alpha-2"].toLowerCase() + '.png" alt="' + countryInfo["alpha-2"] + '" />',
							'country collapsed')
					
					);
						
					for (var textIndex in textsInCountry) {
						var text = textsInCountry[textIndex];
	
						html.push(
							createTextRow(text, isDefaultText, 'collapsed')
						);
						
					}
					
				}				
				
			}
			
			main.html('<table cellspacing="0" class="collapsible">' + html.join('') + '</table>');
			
		}
		
		textsHaveRendered = true;		

		//ext.trigger('change', {type:'change', target: this, data: selectedTextInfo});
	}
	
	main.on('click', '.collapsible .text-chooser-row-header', function() {
		
		var header = $(this),
			children = header.nextUntil('.text-chooser-row-header');
		
		if (header.hasClass('collapsed')) {
			
			header.removeClass('collapsed');
			children.removeClass('collapsed');
			
		} else {

			header.addClass('collapsed');			
			children.addClass('collapsed');			
			
		}
		
		
	});
	
	
	function createTextRow(text, isDefaultText, className) {
		var html = '<tr class="text-chooser-row' + (isDefaultText ? ' is-default-text' : '') + (className != '' ? ' ' + className : '') + '" data-id="' + text.id + '" data-lang-name="' + text.langName + '" data-lang-name-english="' + text.langNameEnglish + '">' +
					'<td class="text-chooser-abbr">' + text.abbr + '</td>' +
					'<td class="text-chooser-name">' +
						'<span>' + text.name + '</span>' +
						(text.hasLemma === true ? '<span class="text-chooser-option-lemma" alt="Lemma Data"></span>' : '') +
						(text.hasAudio === true ? '<span class="text-chooser-option-audio" alt="Lemma Data"></span>' : '') +					
					'</td>' +
				'</tr>';
				
		console.log(text.name, text.hasLemma, text.hasAudio);
				
		return html;		
	}
	
	function createHeaderRow(id, name, englishName, additionalHtml, className) {
		var html = '<tr class="text-chooser-row-header' + (className != '' ? ' ' + className : '') + '" data-id="' + id + '"><td colspan="2">' +
					'<span class="name">' + name + '</span>' + 
					additionalHtml + 
					'</td></tr>';

				
		return html;		
	}	

	function toggle() {

		if (textSelector.is(':visible') ) {
			hide();
		} else {
			show();
		}

	}

	function show() {
		//$('.nav-drop-list').hide();

		size();		

		if (!textsHaveRendered) {
			main.addClass('loading-indicator');//.html('Loading');

			TextLoader.loadTexts(function(data) {
				list_data = data;
				
				// check for countries
				if (sofia.config.enableCountrySelector) {
					var hasCountries = list_data.filter(function(c) { return typeof c.countries != 'undefined' && c.countries.length > 0; }).length > 0;
					if (!hasCountries) {
						listselector.hide();
					}
				}				
				
				main.removeClass('loading-indicator');
				renderTexts(list_data);
				updateRecentlyUsed();
			});
		} else {
			main.removeClass('loading-indicator');
			//updateRecentlyUsed();
		}

		textSelector.show();
		size();
		filter.val('');
		if (!Detection.hasTouch) {
			filter.focus();
		}
		filterVersions();

		if (getMode() == 'languages') {
			updateRecentlyUsed();
		}
	}

	function hide() {
		textSelector.hide();
	}

	function setTextInfo(text) {
		selectedTextInfo = text;

		storeRecentlyUsed(selectedTextInfo);
		updateRecentlyUsed();
		//node.html( selectedTextInfo.name );
	}

	function getTextInfo() {
		return selectedTextInfo;
	}

	function size(width,height) {

		if (isFull) {

			// cover the container area
			if (!(width && height)) {
				width = container.width();
				height = container.height();
			}

			textSelector
				.width(width)
				.height(height)
				.css({top: container.offset().top,left: container.offset().left});

			main
				.width(width)
				.height(height - header.outerHeight());

		} else {
			// reasonable size!
			var targetOffset = target.offset(),
				targetOuterHeight = target.outerHeight(),
				win = $(window),
				selectorWidth = textSelector.outerWidth(),

				top = targetOffset.top + targetOuterHeight + 10,
				left = targetOffset.left,
				winHeight = win.height() - 40,
				winWidth = win.width(),
				maxHeight = winHeight - top;

			if (winWidth < left + selectorWidth) {
				left = winWidth - selectorWidth;
				if (left < 0) {
					left = 0;
				}
			}


			textSelector
				.outerHeight(maxHeight)
				.css({top: top,left: left});

			main
				.outerHeight(maxHeight - header.outerHeight());


			// UP ARROW
			var upArrowLeft = targetOffset.left - left + 20;

			textSelector.find('.up-arrow, .up-arrow-border')
				.css({left: upArrowLeft});

		}
	}

	function isVisible() {
		return textSelector.is(':visible');
	}

	function node() {
		return textSelector;
	}

	function close() {
		textSelector.remove();
		ext.clearListeners();
	}

	var ext = {
		show: show,
		hide: hide,
		toggle: toggle,
		isVisible: isVisible,
		node: node,
		getTextInfo: getTextInfo,
		setTextInfo: setTextInfo,
		renderTexts: renderTexts,
		size: size,
		close: close
	};
	ext = $.extend(true, ext, EventEmitter);



	return ext;

};
