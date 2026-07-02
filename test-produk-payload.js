#!/usr/bin/env node

/**
 * Test script to capture the actual backend response and validate it
 * Run: node test-produk-payload.js
 */

import { calculateProdukStats } from './backend/controllers/helpers/produkHelper.js';
import connectDB from './backend/database/db.js';

(async () => {
  try {
    // Connect to DB
    console.log('[1] Connecting to database...');
    await connectDB();
    console.log('✓ Connected\n');

    // Get stats for last 30 days
    console.log('[2] Calculating produk stats...');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    const stats = await calculateProdukStats(startDate, endDate);
    console.log('✓ Stats calculated\n');

    // Check response structure
    console.log('[3] Validating response structure...');
    const requiredFields = [
      'total_produk',
      'produk_aktif',
      'produk_stagnan',
      'total_produk_terjual',
      'total_omzet',
      'top_selling',
      'bottom_selling',
      'stagnan_produk',
      'semua_produk'
    ];

    let structureValid = true;
    for (const field of requiredFields) {
      if (field in stats) {
        console.log(`  ✓ ${field}`);
      } else {
        console.log(`  ✗ ${field} - MISSING!`);
        structureValid = false;
      }
    }

    if (!structureValid) {
      console.log('\n✗ Response structure incomplete');
      process.exit(1);
    }

    // Check field types
    console.log('\n[4] Checking field types...');
    const checks = [
      ['total_produk', 'number'],
      ['total_produk_terjual', 'number'],
      ['total_omzet', 'number'],
      ['top_selling', 'array'],
      ['bottom_selling', 'array'],
      ['stagnan_produk', 'array'],
      ['semua_produk', 'array']
    ];

    for (const [field, expectedType] of checks) {
      const value = stats[field];
      let actualType = Array.isArray(value) ? 'array' : typeof value;
      const ok = actualType === expectedType;
      const symbol = ok ? '✓' : '✗';
      console.log(`  ${symbol} ${field}: ${actualType} ${ok ? '' : '(expected ' + expectedType + ')'}`);
    }

    // Check array item structure
    console.log('\n[5] Checking array item structure...');
    if (stats.top_selling.length > 0) {
      const item = stats.top_selling[0];
      console.log(`  Sample top_selling item (${stats.top_selling.length} total):`);
      console.log(`    Keys: ${Object.keys(item).join(', ')}`);
      console.log(`    Types: {`);
      for (const [key, val] of Object.entries(item)) {
        const type = Array.isArray(val) ? 'array' : typeof val;
        const valStr = val === null ? 'null' : String(val).substring(0, 50);
        console.log(`      ${key}: ${type} = ${valStr}`);
      }
      console.log(`    }`);
    }

    // Create the payload that will be sent to AI
    console.log('\n[6] Creating AI request payload...');
    const aiPayload = { produk: stats };
    const jsonStr = JSON.stringify(aiPayload);
    console.log(`  Payload size: ${jsonStr.length} bytes`);
    console.log(`  Payload keys: ${Object.keys(aiPayload).join(', ')}`);
    console.log(`  Produk data keys: ${Object.keys(aiPayload.produk).join(', ')}`);

    // Try to validate with Pydantic (via Python)
    console.log('\n[7] Testing Pydantic validation...');
    const response = await fetch('http://localhost:8000/api/v1/bi/produk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: jsonStr
    });

    const responseData = await response.json();
    
    if (response.ok) {
      console.log('✓ AI service accepted the request');
      console.log(`  Response status: ${response.status}`);
      console.log(`  Response keys: ${Object.keys(responseData).join(', ')}`);
    } else {
      console.log(`✗ AI service returned ${response.status}`);
      if (response.status === 422) {
        console.log('  Validation errors:');
        if (responseData.detail && Array.isArray(responseData.detail)) {
          responseData.detail.forEach((err, idx) => {
            console.log(`    [${idx}] ${JSON.stringify(err)}`);
          });
        } else if (responseData.detail) {
          console.log(`  Detail: ${responseData.detail}`);
        }
      } else {
        console.log(`  Response: ${JSON.stringify(responseData).substring(0, 500)}`);
      }
    }

    console.log('\n✅ Test complete');
    process.exit(0);

  } catch (err) {
    console.error('\n✗ Error:', err.message);
    process.exit(1);
  }
})();
