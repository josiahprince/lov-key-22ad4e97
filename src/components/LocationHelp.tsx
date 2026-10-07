// How to turn location back on after refusing it. Browsers don't ask again
// once you've said no, so the person has to change it themselves.
const LocationHelp = () => (
  <div className="rounded-md border bg-muted/50 p-3 text-left text-sm space-y-1.5">
    <p className="font-medium text-foreground">How to allow location</p>
    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
      <li>On a computer: click the icon left of the web address, set <span className="text-foreground">Location</span> to Allow, then reload.</li>
      <li>On iPhone: Settings → Privacy &amp; Security → Location Services → your browser → While Using.</li>
      <li>On Android: tap the icon left of the web address → Permissions → Location → Allow.</li>
    </ul>
  </div>
);

export default LocationHelp;
