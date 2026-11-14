/** The CSS named colours (CSS Color Module 4); the Site names a Semantic Token Role instead. */
export const NAMED_COLOURS: readonly string[] = `aliceblue antiquewhite aqua aquamarine azure beige
	bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral
	cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey
	darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen
	darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray
	dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod
	gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush
	lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen
	lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey
	lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue
	mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise
	mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab
	orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff
	peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown
	seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan
	teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen`.split(/\s+/)

/** The colour families of Tailwind's default palette, which a role utility must never fall back to. */
export const DEFAULT_PALETTE_FAMILIES: readonly string[] = `inherit current transparent white black
	slate gray zinc neutral stone red orange amber yellow lime green emerald teal cyan sky blue indigo
	violet purple fuchsia pink rose`.split(/\s+/)

/** The values the Site may write without naming a role. */
export const ALLOWED_VALUES: readonly string[] = "currentColor transparent inherit none".split(" ")

/** The utility prefixes that can carry a colour, so `font-black` (a weight) is not read as one. */
export const COLOUR_UTILITY_PREFIXES: readonly string[] = `bg text border ring ring-offset outline
	fill stroke divide placeholder accent caret decoration from via to shadow`.split(/\s+/)
