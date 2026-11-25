python -c 'import numpy as np;from scipy.ndimage import zoom; a=np.arange(16,dtype=float).reshape(4,4);a[2,2]=np.nan;print(zoom(a,(1,1),order=1))'
