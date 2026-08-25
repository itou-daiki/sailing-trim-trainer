# Sail Shape Training

This context describes the observable sail-shape model used to teach 420 and 470 trim. It is a calibrated, quasi-steady learning model rather than CFD or a universal tuning table.

## Language

**Draft stripe section**:
A horizontal chordwise slice through a sail at upper (75%), middle (50%), or lower (25%) height. Each section owns its own depth, draft position, and twist.
The surface mesh remains uniformly sampled along the chord, while the exact maximum-camber point is stored independently from the nearest mesh vertex.
_Avoid_: One global sail curve, cosmetic height multiplier, forcing a display-mesh column to be the peak

**Draft depth**:
The maximum camber of a draft stripe divided by its chord length, expressed as a percentage.
_Avoid_: Sail fullness without a measurement plane

**Draft position**:
The distance from the luff to maximum camber divided by chord length, expressed as a percentage from the luff.
The displayed peak ring, section dimension, and numeric reading all use the same exact three-dimensional point.
_Avoid_: Draft as an unlocated amount, locating the peak from a projected screen extremum

**Entry / exit angle**:
The tangent angle of the first and last sampled segments of a draft stripe relative to its chord. These values help describe how abruptly the section turns at the luff and how it releases at the leech. They are measurements of the learning geometry, not wind-tunnel flow angles.
_Avoid_: Angle of attack, exact cloth-edge measurement

**Twist**:
The opening angle of a section relative to the lower reference section. Upper, middle, and lower twist are observed separately.
_Avoid_: Heel, boom angle

**Sail-shape observation**:
A repeatable real-boat sightline and reading order. For a mainsail, observe from the middle of the boom and slightly to windward; for a jib, observe from deck level at the middle of the foot. Aim toward the head and include all three draft stripes from luff to leech. Keep wind, course, camera position, and field of view comparable, then read depth, draft position, entry/exit, and twist before changing one control and comparing with the previous shape.
The trainer's top, side, and boom-end orthographic projections are complementary teaching views; none is presented as a substitute for this calibrated onboard photo position. Draft stripes measure geometry, while telltales and leech ribbons are separate airflow cues.
_Avoid_: Treating any convenient camera angle as directly comparable, reading one isolated stripe as the whole sail, using a telltale as a camber measurement

**Mast bend**:
The forward deflection pattern of the main-sail luff relative to a straight mast reference. It explains how the chock or fore/aft pullers redistribute depth through the lower and middle sail. Controls and standing rig establish the base curve; a small distributed reaction from the loaded flying sail is fed back into the same curve until sail sections and mast bend settle. The displayed millimetres are a class-calibrated teaching estimate, not a strain-gauge measurement.
_Avoid_: A permanently straight luff, one-way shape response, measured rig load, manufacturer-specific stiffness claims

**Reference shape**:
A comparison shape for one boat class, wind speed, and true-wind angle. It is a useful starting range, not a single universally correct race setting.
_Avoid_: Perfect shape, absolute correct trim

**Previous shape**:
The sail surface captured at the start of one slider gesture. It remains as a dashed comparison until another control gesture or condition change, so the learner can attribute depth, draft-position, and twist deltas to one action.
_Avoid_: Target shape, history averaged across several controls

**Shape control**:
A control included in this trainer because it changes draft depth, draft position, twist, or mast-bend distribution. Basic sheet angle, crew balance, and centerboard position remain automatically optimized assumptions.
_Avoid_: Every control on the boat

**Outhaul ease distance**:
The along-boom distance from the mainsail clew eye forward of the outer point at the fore edge of the black band. The control range is 0–25 mm; pulling to the band is 0 mm.
_Avoid_: Percent eased, an arbitrary tension score, visually exaggerating a few millimetres of clew travel

**Mainsail foot boltrope length**:
The length of boltrope sewn into the mainsail foot: 1920 mm for 420 and 2200 mm for 470. It is not the straight distance from tack to clew.
_Avoid_: Mainsail foot length, tack-to-clew chord, clew position

**Control response**:
The direction and relative vertical distribution of a shape change caused by one control. Direct control response and the smaller aeroelastic sail-load feedback are separated, then solved to a stable quasi-steady state. It represents a pedagogical sensitivity, not a measured force or rig load.
_Avoid_: Physics coefficient, measured load

**Sail surface**:
A single three-dimensional form of one sail whose horizontal sections carry the observed depth, draft position, and twist. Every camera view is an observation of this same form.
_Avoid_: Separate drawings for each view, decorative sail curve

**Fixed-luff jib basis**:
A local three-dimensional coordinate system whose rotation axis is the line from the deck tack fitting toward the halyard hoist point. The class-rule luff ends below that measurement point: ERS headsail hoist height is measured at the halyard/mast intersection and is not the sail head position. Sheet angle and twist rotate chord directions around the fixed luff while the class-rule luff, leech, foot, and top-width corner distances remain invariant.
_Avoid_: Rotating every jib stripe in the horizontal plane, stretching a sail edge when the sheet angle changes, placing the sail head at the halyard measurement limit and lifting the tack off the deck

**Class-rule planform**:
The flat outline beneath the live three-dimensional shape. Main leech, cross widths, top width, boltrope, boom outer point and jib edge lengths are calibrated separately for 420 and 470; the clew follows the outer point rather than the boltrope length.
_Avoid_: Uniformly scaling one generic dinghy sail, claiming an exact M-12/N14 cut

**Sail projection**:
An orthographic observation of a sail surface from above, from an oblique side angle, or from the current boom end looking toward the mast. The boom-end projection follows the live boom azimuth and explicitly magnifies only the horizontal draft-depth axis by three so small camber changes remain readable.
Three horizontal draft stripes and their exact peak rings are projected with the surface. A spanwise line connecting peaks is not used because an oblique projection can make it look like a false deepest edge.
_Avoid_: Independent top, side, and aft models, treating a spanwise peak connector as a physical sail seam

**Boom outer point / aft end**:
The class-controlled outer point is the fore edge of the 10 mm outer limit mark at the boom's upper edge, measured aft from the mast: 2400 mm for 420 and 2650 mm for 470. The physical aft end fitting may continue beyond it.
_Avoid_: Treating the clew, outer point, and physical boom end as the same point; drawing a view-specific boom icon

**Mast spar volume**:
A closed twelve-face elliptical spar that starts at the deck and follows the same live bend axis as the mainsail. Its representative 420 and 470 sections use the midpoint of each current class-rule fore-aft and transverse envelope. The actual extrusion profile remains manufacturer-specific, so the model does not claim to reproduce one proprietary section.
_Avoid_: Drawing the mast as a stroked centreline, extending a visible line through the hull, inflating the section merely to make it readable

**Class construction hull model**:
A closed teaching mesh constrained by each World Sailing building plan. The hull shell, transom, crowned deck, side decks, gunwales, cockpit well, centreboard case, thwart, mainsheet track, and breakwater are separate three-dimensional parts in one coordinate system. Published dimensions and arrangement limits are authoritative; fairing between them is a representative interpolation because a builder's production mould surface is not public class data.
_Avoid_: A filled plan-view silhouette, separate hull icons for each camera, claiming manufacturer-CAD identity

**Automatic boom angle**:
The angle between the boom and the hull centreline, with zero degrees on the centreline. It is solved from true wind plus estimated boat speed: close-hauled calibration follows the class guide, reaching trim keeps a 15-degree teaching angle to apparent wind, and broad trim stops at the representative shroud limit. A slower or faster shape therefore changes apparent wind and the automatically optimized angle.
_Avoid_: One wind-independent angle; interpolating from true wind alone; confusing true wind angle with apparent wind or boom angle

**Apparent-wind trim chain**:
The displayed sequence true wind angle/speed → apparent wind angle/speed → automatic boom angle. Boat speed and apparent wind are iterated until the quasi-steady estimate converges. The 15-degree reaching target is an explicit teaching idealization, not a measured optimum for every 420/470 sail, sea state, or mode.
_Avoid_: Hiding the angle rule; claiming a universal exact optimum; treating the current boat speed as independent of sail shape

**Section polar proxy**:
A dimensionless learning estimate of lift, drag, and forward drive for one draft stripe. It compares trim changes consistently but is not a measured sail polar or CFD result.
_Avoid_: Aerodynamic truth, measured coefficient

**Shape efficiency**:
The integrated quality of the current section polar proxies relative to the reference shape in the same wind and course. A value of 100 means the reference response, not universal maximum boat speed.
_Avoid_: Percent of real-world performance, control-position score
