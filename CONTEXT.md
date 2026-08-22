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

**Twist**:
The opening angle of a section relative to the lower reference section. Upper, middle, and lower twist are observed separately.
_Avoid_: Heel, boom angle

**Reference shape**:
A comparison shape for one boat class, wind speed, and true-wind angle. It is a useful starting range, not a single universally correct race setting.
_Avoid_: Perfect shape, absolute correct trim

**Shape control**:
A control included in this trainer because it changes draft depth, draft position, twist, or mast-bend distribution. Basic sheet angle, crew balance, and centerboard position remain automatically optimized assumptions.
_Avoid_: Every control on the boat

**Control response**:
The direction and relative vertical distribution of a shape change caused by one control. It represents a pedagogical sensitivity, not a force or rig load.
_Avoid_: Physics coefficient, measured load
