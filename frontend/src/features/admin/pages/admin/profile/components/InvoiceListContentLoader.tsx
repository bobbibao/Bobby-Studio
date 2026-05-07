import {
  Tr,
  Td,
} from '@chakra-ui/react';
import ContentLoader from 'react-content-loader';

export function InvoiceListContentLoader() {
  return (
    [...Array(5)].map((_, index) => (
      <Tr key={index}>
        <Td colSpan={5}>
          <ContentLoader height={40} speed={2} backgroundColor="#f3f3f3" foregroundColor="#ecebeb">
            <rect x="10" y="10" rx="3" ry="3" width="300" height="10" />
            <rect x="10" y="30" rx="3" ry="3" width="200" height="10" />
          </ContentLoader>
        </Td>
      </Tr>
    ))
  );
}



