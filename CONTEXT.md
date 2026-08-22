# Sail Shape Training

This context describes the observable sail-shape model used to teach 420 and 470 trim. It is a calibrated, quasi-steady learning model rather than CFD or a universal tuning table.

## Language

**Draft stripe section**:
A horizontal chordwise slice through a sail at upper (75%), middle (50%), or lower (25%) height. Each section owns its own depth, draft position, and twist.
_Avoid_: One global sail curve, cosmetic height multiplier

**Draft depth**:
The maximum camber of a draft stripe divided by its chord length, expressed as a percentage.
_Avoid_: Sail fullness without a measurement plane

**Draft position**:
The distance from the luff to maximum camber divided by chord length, expressed as a percentage from the luff.
_Avoid_: Draft as an unlocated amount

**Entry / exit angle**:
The tangent angle of the first and last sampled segments of a draft stripe relative to its chord. These values help describe how abruptly the section turns at the luff and how it releases at the leech. They are measurements of the learning geometry, not wind-tunnel flow angles.
_Avoid_: Angle of attack, exact cloth-edge measurement

**Twist**:
The opening angle of a section relative to the lower reference section. Upper, middle, and lower twist are observed separately.
_Avoid_: Heel, boom angle

**Mast bend**:
The forward deflection pattern of the main-sail luff relative to a straight mast reference. It explains how the chock or fore/aft pullers redistribute depth through the lower and middle sail. The visual trace emphasizes change and is not a millimetre tuning-gauge reading.
_Avoid_: A permanently straight luff, measured rig load, exact pre-bend millimetres

**Reference shape**:
A comparison shape for one boat class, wind speed, and true-wind angle. It is a useful starting range, not a single universally correct race setting.
_Avoid_: Perfect shape, absolute correct trim

**Previous shape**:
The sail surface captured at the start of one slider gesture. It remains as a dashed comparison until another control gesture or condition change, so the learner can attribute depth, draft-position, and twist deltas to one action.
_Avoid_: Target shape, history averaged across several controls

**Shape control**:
A control included in this trainer because it changes draft depth, draft position, twist, or mast-bend distribution. Basic sheet angle, crew balance, and centerboard position remain automatically optimized assumptions.
_Avoid_: Every control on the boat

**Control response**:
The direction and relative vertical distribution of a shape change caused by one control. It represents a pedagogical sensitivity, not a force or rig load.
_Avoid_: Physics coefficient, measured load

**Sail surface**:
A single three-dimensional form of one sail whose horizontal sections carry the observed depth, draft position, and twist. Every camera view is an observation of this same form.
_Avoid_: Separate drawings for each view, decorative sail curve

**Sail projection**:
An orthographic observation of a sail surface from above, from an oblique side angle, or from astern. A projection may hide a dimension but must not invent a different shape.
_Avoid_: Independent top, side, and aft models

**Section polar proxy**:
A dimensionless learning estimate of lift, drag, and forward drive for one draft stripe. It compares trim changes consistently but is not a measured sail polar or CFD result.
_Avoid_: Aerodynamic truth, measured coefficient

**Shape efficiency**:
The integrated quality of the current section polar proxies relative to the reference shape in the same wind and course. A value of 100 means the reference response, not universal maximum boat speed.
_Avoid_: Percent of real-world performance, control-position score
