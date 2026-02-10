#!/bin/bash
# Initialize ccagent constitution in a project

set -e

TARGET="${1:-.}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE_DIR="$SCRIPT_DIR/../templates/constitution"

if [ -d "$TARGET/constitution" ]; then
  echo "⚠️  constitution/ already exists in $TARGET"
  echo "   Use this as a starting point and customize."
  exit 1
fi

echo "📜 Initializing ccagent constitution in $TARGET..."

cp -r "$TEMPLATE_DIR" "$TARGET/constitution"

echo "✅ Created constitution/ directory with:"
echo "   - CONSTITUTION.md (core principles)"
echo "   - invariants.md (hard constraints)"
echo "   - modules/ (per-module intent)"
echo "   - decisions/ (architectural decision records)"
echo "   - amendments/ (constitution changes)"
echo ""
echo "Next steps:"
echo "  1. Edit constitution/CONSTITUTION.md with your project's principles"
echo "  2. Add instructions to your agent config (see docs/agent-integration.md)"
echo "  3. Start coding with intent preservation!"
