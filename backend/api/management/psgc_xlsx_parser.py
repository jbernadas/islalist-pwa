#!/usr/bin/env python3
"""
PSGC Excel Parser
Generates JSON file with Province -> City/Municipality -> Barangay hierarchy
Skips Regions as they are not political units
"""

import pandas as pd
import json
import os


def parse_psgc_to_json():
    # Get the directory where this script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    excel_file = os.path.join(script_dir,
                              'psgc-1q-2025-publication-datafile.xlsx')

    # Output to provinces_data.json in commands directory
    commands_dir = os.path.join(script_dir, 'commands')
    output_file = os.path.join(commands_dir, 'provinces_data.json')

    # Read the PSGC sheet
    print("Reading PSGC data...")
    df = pd.read_excel(excel_file, sheet_name='PSGC')

    print(f"Total rows: {len(df)}")
    print("Processing hierarchical structure...\n")

    # Main data structure
    provinces = []

    # Track current hierarchy
    current_province = None
    current_city_mun = None

    # Process each row
    for _, row in df.iterrows():
        geo_level = row['Geographic Level']

        # Skip if name is NaN
        if pd.isna(row['Name']):
            continue

        # Strip whitespace from name
        name = str(row['Name']).strip()
        psgc_code = row['10-digit PSGC']

        # Skip regions - we don't need them
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
            print(f"Processing province: {name}")

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

    # Create final structure
    output_data = {
        'provinces': provinces
    }

    # Write to JSON file
    print(f"\nWriting JSON to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    # Print statistics
    total_cities_mun = sum(len(p['cities_municipalities'])
                           for p in provinces)
    total_barangays = sum(
        len(cm['barangays'])
        for p in provinces
        for cm in p['cities_municipalities']
    )

    print("\n" + "="*50)
    print("JSON file generated successfully!")
    print("="*50)
    print(f"Total Provinces: {len(provinces)}")
    print(f"Total Cities/Municipalities: {total_cities_mun}")
    print(f"Total Barangays: {total_barangays}")
    print(f"\nOutput file: {output_file}")


if __name__ == '__main__':
    # Confirmation prompt
    print("="*60)
    print("WARNING: This will overwrite provinces_data.json!")
    print("="*60)
    print("\nThis script will:")
    print("  1. Read psgc-1q-2025-publication-datafile.xlsx")
    print("  2. Generate Province -> City/Municipality -> Barangay hierarchy")
    print("  3. OVERWRITE api/management/commands/provinces_data.json")
    print("\nAre you sure you want to continue?")
    print("="*60)

    response = input("Type 'yes' to continue: ").strip().lower()

    if response == 'yes':
        print("\nProceeding with PSGC data parsing...\n")
        parse_psgc_to_json()
    else:
        print("\nOperation cancelled. No files were modified.")
        print("Exiting...")
