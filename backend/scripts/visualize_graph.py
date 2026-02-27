"""Generate a visualization of the conversational advisor LangGraph.

Usage:
    cd backend
    python scripts/visualize_graph.py

Outputs: advisor_graph.png (Mermaid diagram rendered as PNG)
Also prints the Mermaid source so you can paste it into https://mermaid.live
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Build the graph without compiling (avoids needing DB/OpenAI config)
from app.advisor.conv_service import _build_conv_graph

graph = _build_conv_graph()
compiled = graph.compile()

# Print Mermaid diagram source
mermaid_src = compiled.get_graph().draw_mermaid()
print("=== Mermaid Diagram (paste into https://mermaid.live) ===\n")
print(mermaid_src)

# Try to save as PNG (requires graphviz or pyppeteer)
try:
    png_bytes = compiled.get_graph().draw_mermaid_png()
    with open("advisor_graph.png", "wb") as f:
        f.write(png_bytes)
    print("\n=== Saved: advisor_graph.png ===")
except Exception as e:
    print(f"\nCould not generate PNG ({e})")
    print("Use the Mermaid source above at https://mermaid.live to visualize.")
