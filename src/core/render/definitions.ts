import type { ComponentType } from "react";
import type { ArchetypeId } from "../document/registry";
import type { ArchetypeRenderProps } from "./types";
import { Container } from "./archetypes/Container";
import { Text } from "./archetypes/Text";
import { Button } from "./archetypes/Button";
import { Badge } from "./archetypes/Badge";
import { Fab } from "./archetypes/Fab";
import { Toggle } from "./archetypes/Toggle";
import { Input } from "./archetypes/Input";
import { Generic } from "./archetypes/Generic";
import { Divider } from "./archetypes/Divider";
import { Background } from "./archetypes/Background";
import { Image } from "./archetypes/Image";
import { Placeholder } from "./archetypes/Placeholder";
import { Arrow, Ellipse, Line, Polygon, Rectangle, Star } from "./archetypes/Shapes";
import { Icon, SvgGroup, SvgPath, SvgText, SvgUse } from "./archetypes/Svg";

/**
 * One definition per archetype (Phase 17, Law 11). Typed as a complete record, so adding an
 * archetype to the registry without a definition is a compile error.
 */
export const RENDER_DEFINITIONS: Record<ArchetypeId, ComponentType<ArchetypeRenderProps>> = {
  button: Button,
  toggle: Toggle,
  badge: Badge,
  fab: Fab,
  image: Image,
  icon: Icon,
  divider: Divider,
  background: Background,
  container: Container,
  text: Text,
  input: Input,
  form: Container,
  generic: Generic,
  svgPath: SvgPath,
  svgGroup: SvgGroup,
  svgUse: SvgUse,
  svgText: SvgText,
  rectangle: Rectangle,
  ellipse: Ellipse,
  line: Line,
  polygon: Polygon,
  star: Star,
  arrow: Arrow,
  effectSurface: Placeholder,
  object3D: Placeholder,
  camera3D: Placeholder,
  light3D: Placeholder,
};
