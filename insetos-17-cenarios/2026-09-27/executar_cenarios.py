from pathlib import Path
import sys
sys.path.insert(0, "/workspace/tools-train-models-vireo")
import run_predicoes_cenarios as runner
runner.PREDICT_R = Path(__file__).with_name("run_predict_limitado.R")
runner.main()
