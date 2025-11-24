import json
import os
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
    administratively.
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
    help = 'Check for misplaced cities/municipalities based on PSGC codes and optionally fix them'

    def add_arguments(self, parser):
        parser.add_argument(
            '--no-input',
            action='store_true',
            help='Skip confirmation prompt and apply changes automatically',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed information about all checks',
        )

    def handle(self, *args, **kwargs):
        no_input = kwargs.get('no_input', False)
        verbose = kwargs.get('verbose', False)

        json_path = os.path.join(
            os.path.dirname(__file__),
            'provinces_data.json'
        )

        # Load the data
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        provinces = data['provinces']

        ncr_exceptions = get_ncr_and_submun_exceptions()
        huc_placement = get_huc_correct_placement()

        self.stdout.write('='*80)
        self.stdout.write(self.style.WARNING('PSGC CODE-BASED MUNICIPALITY VALIDATION'))
        self.stdout.write('='*80)
        self.stdout.write('')

        # First pass: detect all misplacements
        misplacements = []
        checked_count = 0
        ncr_exception_count = 0
        huc_count = 0
        code_1999_count = 0

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

                # Skip if prefixes match
                if prov_prefix == mun_prefix:
                    if verbose:
                        self.stdout.write(f"✓ {mun_name} in {province_name} - codes match ({prov_prefix})")
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
                    'current_province_code': province_code,
                    'mun_prefix': mun_prefix,
                    'prov_prefix': prov_prefix,
                    'municipality_data': mun,
                    'is_huc': False
                })

        # Display detection results
        self.stdout.write('='*80)
        self.stdout.write('DETECTION RESULTS')
        self.stdout.write('='*80)
        self.stdout.write(f'Total municipalities checked: {checked_count}')
        self.stdout.write(f'  - HUCs processed: {huc_count}')
        self.stdout.write(f'  - NCR/SubMun exceptions: {ncr_exception_count}')
        self.stdout.write(f'  - Code 1999 (newly created): {code_1999_count}')
        self.stdout.write(f'Misplacements detected: {len(misplacements)}')
        self.stdout.write('')

        if not misplacements:
            self.stdout.write(self.style.SUCCESS('✓ No misplacements detected!'))
            self.stdout.write('All municipalities are correctly placed according to their PSGC codes.')
            self.stdout.write('='*80)
            return

        # Second pass: find correct provinces for misplaced municipalities
        self.stdout.write(self.style.ERROR(
            'The following cities/districts/municipalities are MISPLACED according to their PSGC codes:'
        ))
        self.stdout.write('')

        corrections = []
        errors = []

        for i, misplacement in enumerate(misplacements, 1):
            mun_name = misplacement['municipality']
            mun_code = misplacement['municipality_code']
            mun_type = misplacement['municipality_type']
            current_prov = misplacement['current_province']
            is_huc = misplacement.get('is_huc', False)

            # For HUCs, we already know the correct province
            if is_huc:
                correct_province = misplacement['correct_province']

                self.stdout.write(f"{i}. {mun_name} ({mun_type}) [HUC]")
                self.stdout.write(f"   PSGC Code: {mun_code}")
                self.stdout.write(f"   Currently in: {current_prov}")
                self.stdout.write(self.style.SUCCESS(f"   Should be in: {correct_province}"))

                corrections.append({
                    'municipality': mun_name,
                    'municipality_code': mun_code,
                    'municipality_type': mun_type,
                    'from_province': current_prov,
                    'to_province': correct_province,
                    'municipality_data': misplacement['municipality_data']
                })
            else:
                # For regular municipalities, find by PSGC code prefix
                mun_prefix = misplacement['mun_prefix']
                prov_prefix = misplacement['prov_prefix']
                correct_province = None

                for province in provinces:
                    province_code = str(province['code'])
                    check_prefix = province_code[:4]

                    if check_prefix == mun_prefix:
                        correct_province = province['name']
                        break

                self.stdout.write(f"{i}. {mun_name} ({mun_type})")
                self.stdout.write(f"   PSGC Code: {mun_code} (prefix: {mun_prefix})")
                self.stdout.write(f"   Currently in: {current_prov} (prefix: {prov_prefix})")

                if correct_province:
                    self.stdout.write(self.style.SUCCESS(f"   Should be in: {correct_province}"))
                    corrections.append({
                        'municipality': mun_name,
                        'municipality_code': mun_code,
                        'municipality_type': mun_type,
                        'from_province': current_prov,
                        'to_province': correct_province,
                        'municipality_data': misplacement['municipality_data']
                    })
                else:
                    self.stdout.write(self.style.ERROR(
                        f"   ERROR: Cannot find matching province for code prefix {mun_prefix}"
                    ))
                    errors.append({
                        'municipality': mun_name,
                        'code': mun_code,
                        'reason': f'No province with matching code prefix {mun_prefix}'
                    })

            self.stdout.write('')

        # Summary
        self.stdout.write('='*80)
        self.stdout.write('SUMMARY')
        self.stdout.write('='*80)
        self.stdout.write(f'Can be auto-corrected: {len(corrections)}')
        if errors:
            self.stdout.write(self.style.ERROR(f'Cannot be auto-corrected: {len(errors)}'))
            self.stdout.write('')
            self.stdout.write('Municipalities that cannot be auto-corrected:')
            for error in errors:
                self.stdout.write(f"  • {error['municipality']} - {error['reason']}")
        self.stdout.write('')

        if not corrections:
            self.stdout.write('No corrections can be made automatically.')
            self.stdout.write('='*80)
            return

        # Ask for confirmation
        if not no_input:
            self.stdout.write('='*80)
            confirm = input(
                f'Do you want to proceed with correcting these {len(corrections)} misplacements? (yes/no): '
            )
            if confirm.lower() not in ['yes', 'y']:
                self.stdout.write(self.style.WARNING('Operation cancelled by user.'))
                self.stdout.write('='*80)
                return

        # Apply corrections
        self.stdout.write('')
        self.stdout.write('='*80)
        self.stdout.write(self.style.WARNING('APPLYING CORRECTIONS'))
        self.stdout.write('='*80)
        self.stdout.write('')

        changes_made = 0

        for correction in corrections:
            mun_name = correction['municipality']
            from_prov = correction['from_province']
            to_prov = correction['to_province']
            mun_data = correction['municipality_data']

            # Find and remove from current province
            removed = False
            for province in provinces:
                if province['name'] == from_prov:
                    try:
                        province['cities_municipalities'].remove(mun_data)
                        removed = True
                        self.stdout.write(f"✓ Removed {mun_name} from {from_prov}")
                    except ValueError:
                        self.stdout.write(
                            self.style.ERROR(f"✗ Could not remove {mun_name} from {from_prov}")
                        )
                    break

            # Add to correct province
            if removed:
                for province in provinces:
                    if province['name'] == to_prov:
                        province.setdefault('cities_municipalities', []).append(mun_data)
                        self.stdout.write(f"✓ Added {mun_name} to {to_prov}")
                        changes_made += 1
                        break

        # Save the corrected data
        if changes_made > 0:
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)

            self.stdout.write('')
            self.stdout.write('='*80)
            self.stdout.write('CORRECTION COMPLETE')
            self.stdout.write('='*80)
            self.stdout.write(
                self.style.SUCCESS(f'✓ Successfully corrected {changes_made} misplacements!')
            )
            self.stdout.write(f'Updated file: {json_path}')
            self.stdout.write('')
            self.stdout.write(
                self.style.WARNING('IMPORTANT: Run "python manage.py reseed_locations" to update the database.')
            )
            self.stdout.write('='*80)
        else:
            self.stdout.write('')
            self.stdout.write(self.style.WARNING('No changes were made.'))
            self.stdout.write('='*80)
