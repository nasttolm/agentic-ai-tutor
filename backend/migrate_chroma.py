"""
Migrate ChromaDB databases to latest version
"""
import chromadb
from chromadb.config import Settings
from pathlib import Path

# Subjects to migrate
subjects = ['fsd', 'fcs', 'dma']
rag_dir = Path('data/rag')

print("Starting ChromaDB migration...")

for subject in subjects:
    chroma_path = rag_dir / subject / 'chroma_store'

    if not chroma_path.exists():
        print(f"❌ Skipping {subject} - path not found: {chroma_path}")
        continue

    print(f"\n📦 Migrating {subject}...")
    print(f"   Path: {chroma_path}")

    try:
        # Open with new version - this triggers automatic migration
        client = chromadb.PersistentClient(
            path=str(chroma_path),
            settings=Settings(anonymized_telemetry=False)
        )

        # List collections
        collections = client.list_collections()
        print(f"   ✅ Migrated successfully!")
        print(f"   Collections: {[c.name for c in collections]}")

        for coll in collections:
            print(f"      - {coll.name}: {coll.count()} documents")

    except Exception as e:
        print(f"   ❌ Error: {e}")

print("\n✨ Migration complete!")
