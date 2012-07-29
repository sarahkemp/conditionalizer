var conditionalizer;

(function($) {

	// Language strings
	Symphony.Language.add({
		'Add condition': false,
		'Remove condition': false,
		'Condition': false,
		'Parameter': false,
		'{$param}': false,
		'Comparison': false,
		'is': false,
		'is not': false,
		'is in': false,
		'is not in': false,
		'are in': false,
		'are not in': false,
		'Values': false,
		'comma-separated': false,
		'Make sure {$modes}': false,
		'any condition is true': false,
		'any condition is not true': false,
		'any condition equals yes': false,
		'any condition equals no': false,
		'all conditions are true': false,
		'all conditions are not true': false,
		'all conditions equals yes': false,
		'all conditions equals no': false,
		'Output Parameters': false,
		'Required URL Parameter': false,
		'An empty result will be returned when this parameter does not have a value.': false
	});

	// Conditionalizer
	conditionalizer = {
		
		initialized: false,
		editor: true,
		condition: [],
		elements: {},
		
		// Initialise Conditionalizer
		init: function() {
			conditionalizer.elements.fieldset = $('fieldset.conditionalizer');
			conditionalizer.elements.label = conditionalizer.elements.fieldset.find('label');
			conditionalizer.elements.conditions = conditionalizer.elements.label.find('textarea');
			conditionalizer.elements.tags = conditionalizer.elements.fieldset.find('ul.tags');
			
			// Catch error
			if(conditionalizer.elements.fieldset.find('.invalid').length > 0) {
				return;
			}
			
			// Parse condition
			conditionalizer.condition = conditionalizer.tokenize.parse(conditionalizer.elements.conditions.val());
			
			// Check if condition can be displayed in editor
			$.each(conditionalizer.condition[1], function(index, condition) {
				if(condition[1].length > 1) {
					conditionalizer.editor = false;
				}
			});
			if(conditionalizer.editor == false) {
				return;	
			}
			
			// Add Duplicator
			conditionalizer.elements.label.before(conditionalizer.createDuplicator());
			
			// Add mode selection
			conditionalizer.elements.label.before(conditionalizer.createModes());
			
			// Create tag list
			conditionalizer.elements.tags.off('click.tags').on('click.tags', 'li', conditionalizer.clickTag);
			
			// Load required URL parameter
			conditionalizer.loadRequiredParameter();
			
			// Load existing conditions
			if(conditionalizer.elements.conditions.val() != '') {
				conditionalizer.loadConditions();
			}
			
			// Hide modes when only a single condition is present
			conditionalizer.switchModes();
			
			// Save conditions
			$('div.actions input').on('click.conditionalizer', conditionalizer.save);
			
			// Reposition condition interface when the Data Source type supports output options
			$('#ds-context').on('change.conditionalizer', conditionalizer.position).trigger('change.conditionalizer');
			
			// Status
			conditionalizer.initialised = true;
		},
		
		// Create Condition Dupcliator
		createDuplicator: function() {
			conditionalizer.elements.list = $('<ol data-add="' + Symphony.Language.get('Add condition') + '" data-remove="' + Symphony.Language.get('Remove condition') + '"></ol>');
			conditionalizer.elements.list.append(conditionalizer.createTemplate());

			conditionalizer.elements.duplicator = $('<div class="frame" />');
			conditionalizer.elements.duplicator.append(conditionalizer.elements.list).symphonyDuplicator().on('constructstop.duplicator destructstart.duplicator', conditionalizer.switchModes);
				
			return conditionalizer.elements.duplicator;
		},
		
		// Create template
		createTemplate: function() {
			conditionalizer.elements.template = $('<li class="template">' + 
				'<header><h4>' + Symphony.Language.get('Condition') + '</h4></header>' +
				'<div class="content">' +
					'<div class="three columns">' +
						'<label class="column">' +
							'<select name="conditionalizer[param]"></select>' +
						'</label>' +
						'<label class="column">' +
							'<select name="conditionalizer[comparison]">' +
								'<option value="is">' + Symphony.Language.get('is') + '</option>' +
								'<option value="is not">' + Symphony.Language.get('is not') + '</option>' +
								'<option value="is in">' + Symphony.Language.get('is in') + '</option>' +
								'<option value="is not in">' + Symphony.Language.get('is not in') + '</option>' +
								'<option value="are in">' + Symphony.Language.get('are in') + '</option>' +
								'<option value="are not in">' + Symphony.Language.get('are not in') + '</option>' +
							'</select>' +
						'</label>' +
						'<label class="column">' +
							'<input type="text" name="conditionalizer[value]" value="" placeholder="comma, separated" />' +
						'</label>' +
					'</div>' +
				'</div>' +
			'</li>');
			
			// Get available parameters
			conditionalizer.addParameters(
				conditionalizer.elements.template.find('select:first')
			);
			
			return conditionalizer.elements.template;
		},
		
		// Create mode selection
		createModes: function() {
			conditionalizer.elements.modes = $('<p />', {
				class: 'modes',
				html: Symphony.Language.get('Make sure {$modes}', {
					'modes': conditionalizer.createModeOptions().prop('outerHTML')
				})
			});
						
			return conditionalizer.elements.modes;
		},
		
		// Create mode options
		createModeOptions: function() {
			conditionalizer.elements.options = $('<select name="conditionalizer[mode]">' + 
				'<option value="any-true">' + Symphony.Language.get('any condition is true') + '</option>' +
				'<option value="any-false">' + Symphony.Language.get('any condition is false') + '</option>' +
				'<option value="any-yes">' + Symphony.Language.get('any condition equals yes') + '</option>' +
				'<option value="any-no">' + Symphony.Language.get('any condition equals no') + '</option>' +
				'<option value="all-true">' + Symphony.Language.get('all conditions are true') + '</option>' +
				'<option value="all-false">' + Symphony.Language.get('all conditions are false') + '</option>' +
				'<option value="all-yes">' + Symphony.Language.get('all conditions are yes') + '</option>' +
				'<option value="all-no">' + Symphony.Language.get('all conditions are no') + '</option>' +
			'</select>');
			
			return conditionalizer.elements.options;
		},
		
		switchModes: function(event) {
			if(conditionalizer.elements.list.find('li').length > 1) {
				console.log('> 1');
				conditionalizer.elements.modes.fadeIn();
			}
			else {
				console.log('= 1');
				conditionalizer.elements.modes.fadeOut();
			}
		},
		
		// Get available parameters from tag list
		addParameters: function(select) {
			conditionalizer.elements.tags.find('li').each(function() {
				var text = $(this).text();
				
				if(text.slice(0, 1) == '$') {
					$('<option />', {
						text: $(this).text(),
						value: '{' + $(this).text() + '}'
					}).appendTo(select);
				}
			});
		},
		
		// Load existing conditions
		loadConditions: function() {
			var string = conditionalizer.elements.conditions.val();
			var conditions = conditionalizer.condition;
						
			// Set modes
			if(conditions[0] == 'all of') {
				if((conditions[2] == 'is' && conditions[3][0] == 'true') || (conditions[2] == 'is not' && conditions[3][0] == 'false')) {
					conditionalizer.elements.modes.find('select').val('all-true');
				}
				else if((conditions[2] == 'is' && conditions[3][0] == 'false') || (conditions[2] == 'is not' && conditions[3][0] == 'true')) {
					conditionalizer.elements.modes.find('select').val('all-false');
				}
				else if((conditions[2] == 'is' && conditions[3][0] == 'yes') || (conditions[2] == 'is not' && conditions[3][0] == 'no')) {
					conditionalizer.elements.modes.find('select').val('all-yes');
				}
				else if((conditions[2] == 'is' && conditions[3][0] == 'no') || (conditions[2] == 'is not' && conditions[3][0] == 'yes')) {
					conditionalizer.elements.modes.find('select').val('all-no');
				}
			}
			else {
				if((conditions[2] == 'is' && conditions[3][0] == 'false') || (conditions[2] == 'is not' && conditions[3][0] == 'true')) {
					conditionalizer.elements.modes.find('select').val('any-false');
				}
				else if((conditions[2] == 'is' && conditions[3][0] == 'yes') || (conditions[2] == 'is not' && conditions[3][0] == 'no')) {
					conditionalizer.elements.modes.find('select').val('any-yes');
				}
				else if((conditions[2] == 'is' && conditions[3][0] == 'no') || (conditions[2] == 'is not' && conditions[3][0] == 'yes')) {
					conditionalizer.elements.modes.find('select').val('any-no');
				}
				else {
					conditionalizer.elements.modes.find('select').val('any-true');				
				}
			}
			
			// Multiple conditions
			if(conditions[1].length > 1) {
				$.each(conditions[1], function(index, condition) {
					conditionalizer.addCondition(condition);
				});
			}
			
			// Single condition
			else {
				conditionalizer.addCondition(conditions);
			}
		},
		
		// Add condition
		addCondition: function(condition) {
			var instance = conditionalizer.elements.template.clone().removeClass('template').addClass('instance'),
				param, comparison, value;
			
			// Check condition
			if($.isArray(condition)) {
				param = condition[1][0];
				comparison = condition[2];
				value = condition[3][0];
			}
			else {
				param = condition;
				comparison = 'is not';
				value = '';
			}
			
			// Check condition
			if(param.substr(0, 1) != '{') {
				param = '{' + param + '}';
			}
			
			// Set values
			instance.find('select:eq(0)').val(param);
			instance.find('select:eq(1)').val(comparison);
			instance.find('input').val(value);
			
			instance.appendTo(conditionalizer.elements.list).trigger('constructstop.duplicator');
			conditionalizer.elements.duplicator.removeClass('empty');
		},
		
		save: function(event) {
			var instances = conditionalizer.elements.list.find('li');
				count = instances.length,
				conditions = [];
			
			// Single condition
			if(count == 1) {
				conditionalizer.elements.conditions.val(conditionalizer.conditionToString(instances));
			}
			
			// Multiple conditions
			else if(count > 1) {
				$.each(instances, function(index, instance) {
					instance = $(instance);
					conditions[index] = conditionalizer.conditionToString(instance);
				});
				conditions = conditions.join(', ');
				
				// Get mode
				if(conditionalizer.elements.modes.find('select').val() == 'any-true') {
					conditionalizer.elements.conditions.val('(if any of (' + conditions + ') is (true))');			
				}				
				else if(conditionalizer.elements.modes.find('select').val() == 'any-false') {
					conditionalizer.elements.conditions.val('(if any of (' + conditions + ') is (false))');			
				}
				else if(conditionalizer.elements.modes.find('select').val() == 'any-yes') {
					conditionalizer.elements.conditions.val('(if any of (' + conditions + ') is (yes))');			
				}
				else if(conditionalizer.elements.modes.find('select').val() == 'any-no') {
					conditionalizer.elements.conditions.val('(if any of (' + conditions + ') is (no))');			
				}
				if(conditionalizer.elements.modes.find('select').val() == 'all-true') {
					conditionalizer.elements.conditions.val('(if all of (' + conditions + ') is (true))');			
				}				
				else if(conditionalizer.elements.modes.find('select').val() == 'all-false') {
					conditionalizer.elements.conditions.val('(if all of (' + conditions + ') is (false))');			
				}
				else if(conditionalizer.elements.modes.find('select').val() == 'all-yes') {
					conditionalizer.elements.conditions.val('(if all of (' + conditions + ') is (yes))');			
				}
				else if(conditionalizer.elements.modes.find('select').val() == 'all-no') {
					conditionalizer.elements.conditions.val('(if all of (' + conditions + ') is (no))');			
				}
			}
			
			// No conditions
			else {
				conditionalizer.elements.conditions.val('');
			}
		},
		
		conditionToString: function(instance) {
			return '(if value of (' + instance.find('select:eq(0)').val() + ') ' + instance.find('select:eq(1)').val() + ' (' + instance.find('input').val() + '))';
		},
		
		position: function() {
			var outputOptions = $('legend:contains("' + Symphony.Language.get('Output Options') + '"):visible');
			if(outputOptions.length > 0) {
				conditionalizer.elements.fieldset.insertBefore(outputOptions.parent());
			}
			else {
				conditionalizer.elements.fieldset.insertBefore('div.actions');
			}
		},
		
		loadRequiredParameter: function() {
			var label = $('label:contains("' + Symphony.Language.get('Required URL Parameter') + '"):visible');
			if(label.length > 0) {
				var param = label.find('input').val();
				if(param != '') {
					conditionalizer.addCondition(param);
				}
			}
			
			// Remove all required URL parameter fields
			var labels = $('label:contains("' + Symphony.Language.get('Required URL Parameter') + '")').remove();
			labels.next('p.help').remove();
			
			// Remove unneeded help texts
			$('p.help:contains("' + Symphony.Language.get('An empty result will be returned when this parameter does not have a value.') + '")').remove();
		},
		
		// Click tags
		clickTag: function(event) {
			var item = $(this),
				object = item.parent(),
				input = object.prev().find('textarea.code'),
				value = input.val(),
				tag = item.attr('class') || item.text(),
				start = input[0].selectionStart,
				end = input[0].selectionEnd,
				position = 0;

			// Insert tag
			if(start > 0) {
				input.val(value.substring(0, start) + tag + value.substring(end, value.length));
				position = start + tag.length;
			}

			// Append tag
			else {
				input.val(value + tag);
				position = value.length + tag.length;
			}

			// Reset cursor position
			input[0].selectionStart = position;
			input[0].selectionEnd = position;
		}
	}

	// Initialisation
	$(document).on('ready.conditionalizer', function ready() {
		conditionalizer.init();
	});

})(jQuery.noConflict());
