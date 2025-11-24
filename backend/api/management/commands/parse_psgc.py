import json
import os
import pandas as pd
from django.core.management.base import BaseCommand


def get_ncr_and_submun_exceptions():
    """
    Returns set of NCR cities and Manila districts that have special PSGC codes.
    These are truly fixed to Metro Manila and don't need province validation.
    """
    return {
        # Metro Manila cities (all have 1380-1381 codes instead of 1300)
        'City of Caloocan', 'City of Las Piñas', 'City of Makati', 'City of Malabon',
        'City of Mandaluyong', 'City of Manila', 'City of Marikina', 'City of Muntinlupa',
        'City of Navotas', 'City of Parañaque', 'Pasay City', 'City of Pasig',
        'Quezon City', 'City of San Juan', 'City of Taguig', 'City of Valenzuela',
        'Pateros',
        # Manila districts (SubMun types)
        'Tondo I/II', 'Binondo', 'Quiapo', 'San Nicolas', 'Santa Cruz', 'Sampaloc',
        'San Miguel', 'Ermita', 'Intramuros', 'Malate', 'Paco', 'Pandacan',
        'Port Area', 'Santa Ana',
    }


def get_huc_correct_placement():
    """
    Returns mapping of Highly Urbanized Cities to their correct provinces.
    HUCs have independent PSGC codes, but they still belong to specific provinces
    administratively. The XLSX file may have them misplaced.
    """
    return {
        'City of Angeles': 'Pampanga',
        'City of Bacolod': 'Negros Occidental',
        'City of Baguio': 'Benguet',
        'City of Butuan': 'Agusan del Norte',
        'City of Cagayan De Oro': 'Misamis Oriental',
        'City of Cebu': 'Cebu',
        'City of Davao': 'Davao del Sur',
        'City of General Santos': 'South Cotabato',
        'City of Iligan': 'Lanao del Norte',
        'City of Iloilo': 'Iloilo',
        'City of Isabela': 'Zamboanga Sibugay',
        'City of Lapu-Lapu': 'Cebu',
        'City of Lucena': 'Quezon',
        'City of Mandaue': 'Cebu',
        'City of Olongapo': 'Zambales',
        'City of Puerto Princesa': 'Palawan',
        'City of Tacloban': 'Leyte',
        'City of Zamboanga': 'Zamboanga del Sur',
    }


class Command(BaseCommand):
    help = 'Parse PSGC Excel file and generate provinces_data.json with validation'

    def add_arguments(self, parser):
        parser.add_argument(
            '--no-validation',
            action='store_true',
            help='Skip PSGC code validation and auto-correction (not recommended)',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed validation information',
        )
        parser.add_argument(
            '--no-input',
            action='store_true',
            help='Skip confirmation prompt',
        )

    def handle(self, *args, **kwargs):
        no_input = kwargs.get('no_input', False)
        validate = not kwargs.get('no_validation', False)
        verbose = kwargs.get('verbose', False)

        # Get file paths
        script_dir = os.path.dirname(os.path.abspath(__file__))
        excel_file = os.path.join(
            os.path.dirname(script_dir),
            'psgc-1q-2025-publication-datafile.xlsx'
        )
        output_file = os.path.join(script_dir, 'provinces_data.json')

        # Confirmation prompt
        if not no_input:
            self.stdout.write('='*80)
            self.stdout.write(self.style.WARNING('WARNING: This will overwrite provinces_data.json!'))
            self.stdout.write('='*80)
            self.stdout.write('\nThis script will:')
            self.stdout.write('  1. Read psgc-1q-2025-publication-datafile.xlsx')
            self.stdout.write('  2. Generate Province -> City/Municipality -> Barangay hierarchy')
            if validate:
                self.stdout.write('  3. Validate and auto-correct misplaced municipalities')
                self.stdout.write('  4. OVERWRITE provinces_data.json')
            else:
                self.stdout.write('  3. OVERWRITE provinces_data.json')
                self.stdout.write(self.style.WARNING(
                    '     (⚠ WARNING: Validation disabled - output may contain errors)'
                ))
            self.stdout.write('\nAre you sure you want to continue?')
            self.stdout.write('='*80)

            confirm = input('Type "yes" to continue: ').strip().lower()

            if confirm != 'yes':
                self.stdout.write(self.style.ERROR('Operation cancelled. No files were modified.'))
                return

        self.stdout.write('\nProceeding with PSGC data parsing...\n')

        # Read the PSGC sheet
        self.stdout.write('Reading PSGC data...')

        try:
            df = pd.read_excel(excel_file, sheet_name='PSGC')
        except FileNotFoundError:
            self.stdout.write(
                self.style.ERROR(f'Error: Excel file not found at {excel_file}')
            )
            return
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error reading Excel file: {e}')
            )
            return

        self.stdout.write(f'Total rows: {len(df)}')
        self.stdout.write('Processing hierarchical structure...\n')

        # Main data structure
        provinces = []

        # Track current hierarchy
        current_province = None
        current_city_mun = None

        # Process each row (initial pass - follows XLSX order)
        for _, row in df.iterrows():
            geo_level = row['Geographic Level']

            # Skip if name is NaN
            if pd.isna(row['Name']):
                continue

            # Strip whitespace from name
            name = str(row['Name']).strip()
            psgc_code = row['10-digit PSGC']

            # Special case: NCR (National Capital Region) should be treated as a province
            if geo_level == 'Reg' and 'NCR' in name.upper():
                current_province = {
                    'name': 'Metro Manila (NCR)',
                    'code': psgc_code,
                    'cities_municipalities': []
                }
                provinces.append(current_province)
                current_city_mun = None
                self.stdout.write('Processing special region as province: Metro Manila (NCR)')
                continue

            # Skip other regions - we don't need them
            if geo_level == 'Reg':
                continue

            # Province level - create new province entry
            elif geo_level == 'Prov':
                current_province = {
                    'name': name,
                    'code': psgc_code,
                    'cities_municipalities': []
                }
                provinces.append(current_province)
                current_city_mun = None
                self.stdout.write(f'Processing province: {name}')

            # City/Municipality level - add to current province
            elif geo_level in ['Mun', 'City', 'SubMun']:
                if current_province is not None:
                    current_city_mun = {
                        'name': name,
                        'code': psgc_code,
                        'type': geo_level,
                        'barangays': []
                    }
                    current_province['cities_municipalities'].append(
                        current_city_mun
                    )

            # Barangay level - add to current city/municipality
            elif geo_level == 'Bgy':
                if current_city_mun is not None:
                    current_city_mun['barangays'].append({
                        'name': name,
                        'code': psgc_code
                    })

        # Validation and correction pass
        if validate:
            self.stdout.write('')
            self.stdout.write('='*80)
            self.stdout.write('VALIDATING PSGC CODE CONSISTENCY')
            self.stdout.write('='*80)
            self.stdout.write('')

            ncr_exceptions = get_ncr_and_submun_exceptions()
            huc_placement = get_huc_correct_placement()
            misplacements = []
            checked_count = 0
            ncr_exception_count = 0
            huc_count = 0
            code_1999_count = 0

            # First, detect all misplacements
            for province in provinces:
                province_name = province['name']
                province_code = str(province['code'])
                prov_prefix = province_code[:4]

                for mun in province.get('cities_municipalities', []):
                    mun_name = mun['name']
                    mun_code = str(mun['code'])
                    mun_type = mun.get('type', 'Mun')
                    mun_prefix = mun_code[:4]

                    checked_count += 1

                    # Check if it's a Highly Urbanized City
                    if mun_name in huc_placement:
                        huc_count += 1
                        correct_province = huc_placement[mun_name]

                        if province_name != correct_province:
                            # HUC is in wrong province - needs correction
                            if verbose:
                                self.stdout.write(
                                    f"⚠ {mun_name} - HUC misplaced: {province_name} → {correct_province}"
                                )
                            misplacements.append({
                                'municipality': mun_name,
                                'municipality_code': mun_code,
                                'municipality_type': mun_type,
                                'current_province': province_name,
                                'correct_province': correct_province,
                                'municipality_data': mun,
                                'is_huc': True
                            })
                        else:
                            # HUC is in correct province
                            if verbose:
                                self.stdout.write(
                                    f"✓ {mun_name} - HUC correctly placed in {province_name}"
                                )
                        continue

                    # Check if prefixes match
                    if prov_prefix == mun_prefix:
                        if verbose:
                            self.stdout.write(
                                f"✓ {mun_name} in {province_name} - codes match ({prov_prefix})"
                            )
                        continue

                    # Skip if it's NCR or Manila district
                    if mun_name in ncr_exceptions:
                        ncr_exception_count += 1
                        if verbose:
                            self.stdout.write(
                                f"⊙ {mun_name} in {province_name} - NCR/SubMun exception"
                            )
                        continue

                    # Skip if it's a newly created municipality (code starts with 1999)
                    if mun_code.startswith('1999'):
                        code_1999_count += 1
                        if verbose:
                            self.stdout.write(
                                f"⊙ {mun_name} in {province_name} - newly created (code 1999)"
                            )
                        continue

                    # This is a regular misplacement!
                    misplacements.append({
                        'municipality': mun_name,
                        'municipality_code': mun_code,
                        'municipality_type': mun_type,
                        'current_province': province_name,
                        'mun_prefix': mun_prefix,
                        'municipality_data': mun,
                        'is_huc': False
                    })

            self.stdout.write(f'Municipalities checked: {checked_count}')
            self.stdout.write(f'  - HUCs processed: {huc_count}')
            self.stdout.write(f'  - NCR/SubMun exceptions: {ncr_exception_count}')
            self.stdout.write(f'  - Code 1999 (newly created): {code_1999_count}')
            self.stdout.write(f'Misplacements detected: {len(misplacements)}')
            self.stdout.write('')

            if misplacements:
                self.stdout.write('='*80)
                self.stdout.write('DETECTED MISPLACEMENTS - AUTO-CORRECTING')
                self.stdout.write('='*80)
                self.stdout.write('')

                corrections = []
                errors = []

                for misplacement in misplacements:
                    mun_name = misplacement['municipality']
                    mun_code = misplacement['municipality_code']
                    current_prov = misplacement['current_province']
                    is_huc = misplacement.get('is_huc', False)

                    # For HUCs, we already know the correct province
                    if is_huc:
                        correct_province = misplacement['correct_province']
                        self.stdout.write(
                            f"• {mun_name} (HUC): {current_prov} → {correct_province}"
                        )
                        corrections.append({
                            'municipality_data': misplacement['municipality_data'],
                            'from_province': current_prov,
                            'to_province': correct_province,
                        })
                    else:
                        # For regular municipalities, find by PSGC code prefix
                        mun_prefix = misplacement['mun_prefix']
                        correct_province = None
                        for province in provinces:
                            province_code = str(province['code'])
                            check_prefix = province_code[:4]

                            if check_prefix == mun_prefix:
                                correct_province = province['name']
                                break

                        if correct_province:
                            self.stdout.write(
                                f"• {mun_name}: {current_prov} → {correct_province}"
                            )
                            corrections.append({
                                'municipality_data': misplacement['municipality_data'],
                                'from_province': current_prov,
                                'to_province': correct_province,
                            })
                        else:
                            self.stdout.write(self.style.ERROR(
                                f"✗ ERROR: {mun_name} - cannot find matching province for prefix {mun_prefix}"
                            ))
                            errors.append({
                                'municipality': mun_name,
                                'code': mun_code,
                            })

                # Apply corrections
                self.stdout.write(f"\nApplying {len(corrections)} correction(s)...\n")

                for correction in corrections:
                    mun_data = correction['municipality_data']
                    from_prov = correction['from_province']
                    to_prov = correction['to_province']

                    # Remove from current province
                    for province in provinces:
                        if province['name'] == from_prov:
                            try:
                                province['cities_municipalities'].remove(mun_data)
                            except ValueError:
                                pass
                            break

                    # Add to correct province
                    for province in provinces:
                        if province['name'] == to_prov:
                            province.setdefault('cities_municipalities', []).append(mun_data)
                            break

                self.stdout.write(self.style.SUCCESS(f"✓ Applied {len(corrections)} correction(s)"))

                if errors:
                    self.stdout.write(self.style.WARNING(
                        f"\n⚠ WARNING: {len(errors)} municipalities could not be auto-corrected"
                    ))

            else:
                self.stdout.write(self.style.SUCCESS(
                    '✓ No misplacements detected - all municipalities are correctly placed!'
                ))

        # Create final structure
        output_data = {
            'provinces': provinces
        }

        # Write to JSON file
        self.stdout.write('')
        self.stdout.write(f'Writing JSON to {output_file}...')

        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(output_data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error writing JSON file: {e}')
            )
            return

        # Print statistics
        total_cities_mun = sum(len(p['cities_municipalities']) for p in provinces)
        total_barangays = sum(
            len(cm['barangays'])
            for p in provinces
            for cm in p['cities_municipalities']
        )

        self.stdout.write('')
        self.stdout.write('='*80)
        self.stdout.write(self.style.SUCCESS('JSON FILE GENERATED SUCCESSFULLY!'))
        self.stdout.write('='*80)
        self.stdout.write(f'Total Provinces: {len(provinces)}')
        self.stdout.write(f'Total Cities/Municipalities: {total_cities_mun}')
        self.stdout.write(f'Total Barangays: {total_barangays}')
        self.stdout.write(f'\nOutput file: {output_file}')
        self.stdout.write('='*80)
