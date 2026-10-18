"""Generate the original install QR without depending on a third-party image endpoint."""
from pathlib import Path
from reportlab.graphics.barcode.qrencoder import QRCode, QRErrorCorrectLevel
url='https://shiftly-calendar.bartoloandre.chatgpt.site/?install=1'
qr=QRCode(None,QRErrorCorrectLevel.M);qr.addData(url);qr.make()
size=qr.getModuleCount();border=4
path=' '.join(f'M{x+border} {y+border}h1v1h-1z' for y in range(size) for x in range(size) if qr.isDark(y,x))
svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size+border*2} {size+border*2}" shape-rendering="crispEdges"><title>Install Shiftly</title><rect width="100%" height="100%" fill="white"/><path d="{path}" fill="#101828"/></svg>\n'
Path('public/share/install-qr.svg').write_text(svg)
print(f'Generated {size} × {size} module installation QR with a 4-module quiet zone')
