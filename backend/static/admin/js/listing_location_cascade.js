(function($) {
    'use strict';

    $(document).ready(function() {
        var provinceField = $('#id_province');
        var municipalityField = $('#id_municipality');
        var barangayField = $('#id_barangay');

        // Store original options
        var allMunicipalities = [];
        var allBarangays = [];

        // Cache municipality options
        municipalityField.find('option').each(function() {
            if ($(this).val()) {
                allMunicipalities.push({
                    value: $(this).val(),
                    text: $(this).text(),
                    provinceId: $(this).data('province-id')
                });
            }
        });

        // Cache barangay options
        barangayField.find('option').each(function() {
            if ($(this).val()) {
                allBarangays.push({
                    value: $(this).val(),
                    text: $(this).text(),
                    municipalityId: $(this).data('municipality-id')
                });
            }
        });

        // Filter municipalities when province changes
        provinceField.on('change', function() {
            var provinceId = $(this).val();

            // Clear and reset municipality dropdown
            municipalityField.empty();
            municipalityField.append($('<option></option>').attr('value', '').text('---------'));

            if (provinceId) {
                // Fetch municipalities for selected province via AJAX
                $.ajax({
                    url: '/api/municipalities/?province=' + provinceId + '&active=true',
                    method: 'GET',
                    success: function(data) {
                        $.each(data, function(index, municipality) {
                            municipalityField.append(
                                $('<option></option>')
                                    .attr('value', municipality.id)
                                    .text(municipality.name)
                            );
                        });
                    },
                    error: function() {
                        console.error('Failed to load municipalities');
                    }
                });
            }

            // Clear barangay when province changes
            barangayField.empty();
            barangayField.append($('<option></option>').attr('value', '').text('---------'));
        });

        // Filter barangays when municipality changes
        municipalityField.on('change', function() {
            var municipalityId = $(this).val();

            // Clear and reset barangay dropdown
            barangayField.empty();
            barangayField.append($('<option></option>').attr('value', '').text('---------'));

            if (municipalityId) {
                // Fetch barangays for selected municipality via AJAX
                $.ajax({
                    url: '/api/barangays/?municipality=' + municipalityId + '&active=true',
                    method: 'GET',
                    success: function(data) {
                        $.each(data, function(index, barangay) {
                            barangayField.append(
                                $('<option></option>')
                                    .attr('value', barangay.id)
                                    .text(barangay.name)
                            );
                        });
                    },
                    error: function() {
                        console.error('Failed to load barangays');
                    }
                });
            }
        });

        // Trigger initial load if province is already selected (for edit forms)
        if (provinceField.val()) {
            var selectedMunicipality = municipalityField.val();
            provinceField.trigger('change');

            // Wait for municipalities to load, then set the selected value
            setTimeout(function() {
                if (selectedMunicipality) {
                    municipalityField.val(selectedMunicipality);
                    municipalityField.trigger('change');
                }
            }, 500);
        }

        // Trigger initial load if municipality is already selected (for edit forms)
        if (municipalityField.val() && !provinceField.val()) {
            municipalityField.trigger('change');
        }
    });
})(django.jQuery);
