import type {Shift} from './engine';

function luminance(hex:string){
 const channels=hex.slice(1).match(/../g)!.map(value=>parseInt(value,16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);
 return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
}
export function contrastRatio(first:string,second:string){const a=luminance(first),b=luminance(second);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);}
// Keep the saved duty colour. Correct only the display ink when its saved
// text colour would be hard to read across a full date cell.
export function cellColours(shift:Pick<Shift,'color'|'textColor'>){
 const background=shift.color,preferred=shift.textColor;
 const foreground=contrastRatio(background,preferred)>=4.5?preferred:contrastRatio(background,'#000000')>=contrastRatio(background,'#ffffff')?'#000000':'#ffffff';
 return {'--duty-cell-bg':background,'--duty-cell-ink':foreground};
}
