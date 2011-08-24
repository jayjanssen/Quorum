<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:template match="lease">
<html>
<head>
	<title>Lease: <xsl:value-of select="key"/></title>
</head>
<body>
	<h2>Lease: <xsl:value-of select="key"/></h2>
	<table>
		<tr><th>Owner</th><td><xsl:value-of select="owner_name"/> (<xsl:value-of select="owner"/>)</td></tr>
		<tr><th>TTL</th><td><xsl:value-of select="ttl"/></td></tr>
	</table>
</body>
</html>
</xsl:template>
</xsl:stylesheet>