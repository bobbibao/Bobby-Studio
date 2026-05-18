import { Link } from 'react-router-dom';
import { Box, Grid, GridItem, Card, CardBody, Center, Heading, Text, Button } from '@chakra-ui/react';


const ErrorPageNotFound = () => {
	return (
		<>

			<Box py={{ base: 2, sm: 5 }} px={{ base: 0, sm: 4 }}>
				<Grid templateColumns="repeat(12, 1fr)" justifyItems="center">
					<GridItem colSpan={{ base: 12, md: 8, lg: 6, xl: 5 }} maxW="lg">
						<Card>
							{/* logo */}
							<CardBody textAlign="center" bg="primary" py={4}>
								<Link to="/">
									<Box>
										{/* <img src={Logo} alt="logo" height={22} /> */}
									</Box>
								</Link>
							</CardBody>

							<CardBody p={4}>
								<Center flexDirection="column">
									<Heading as="h1" color="red.500" fontSize="6xl">
										4<i className="mdi mdi-emoticon-sad"></i>4
									</Heading>
									<Heading as="h4" color="red.600" mt={3} textTransform="uppercase">
										Page Not Found
									</Heading>
									<Text color="gray.500" mt={3}>
										It's looking like you may have taken a wrong turn. Don't
										worry... it happens to the best of us. Here's a little tip that might
										help you get back on track.
									</Text>

									<Link to="/">
										<Button mt={4} colorScheme="teal" leftIcon={<i className="mdi mdi-reply"></i>}>
											Return Home
										</Button>
									</Link>
								</Center>
							</CardBody>
						</Card>
					</GridItem>
				</Grid>
			</Box>

			<Box textAlign="center" py={4} bg="gray.800" color="white">
				2018 - {new Date().getFullYear()} © bobby
			</Box>
		</>
	);
};

export default ErrorPageNotFound;


