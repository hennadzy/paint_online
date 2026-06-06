const { pgPool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function seedColoringSections() {
  try {
    console.log('Starting coloring sections seed...');
    
    const sqlPath = path.join(__dirname, '../migrations/seed_coloring_sections_rooms_ru.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await pgPool.query(sql);
    
    console.log('✅ Coloring sections and rooms seeded successfully!');
    
    const sectionsResult = await pgPool.query('SELECT id, slug, title FROM coloring_sections ORDER BY id');
    console.log('\n📁 Created sections:');
    sectionsResult.rows.forEach(row => {
      console.log(`   ${row.id}. ${row.title} (${row.slug})`);
    });
    
    const roomsResult = await pgPool.query('SELECT COUNT(*) as count FROM coloring_rooms');
    console.log(`\n📦 Created rooms: ${roomsResult.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error seeding coloring sections:', error.message);
    if (error.detail) console.error('   Detail:', error.detail);
    if (error.hint) console.error('   Hint:', error.hint);
  } finally {
    await pgPool.end();
    process.exit(0);
  }
}

seedColoringSections();
